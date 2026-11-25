use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn generator_version() -> u32 {
    1
}

#[wasm_bindgen]
pub struct MarketGenerator {
    random_state: u32,
    instruments: Vec<InstrumentState>,
}

struct InstrumentState {
    reference_price_cents: i64,
}

struct GeneratedMarketUpdate {
    instrument_index: u32,
    price_cents: i64,
    trade_quantity: u32,
    bid_cents: i64,
    ask_cents: i64,
    bid_quantity: u32,
    ask_quantity: u32,
}

impl InstrumentState {
    fn advance_price(&mut self, random_value: u32) -> i64 {
        let delta_cents = i64::from(random_value % 11) - 5;

        self.reference_price_cents = self
            .reference_price_cents
            .saturating_add(delta_cents)
            .max(1);

        self.reference_price_cents
    }
}

fn is_valid_instrument_count(count: u32) -> bool {
    (1..=50).contains(&count)
}

#[wasm_bindgen]
impl MarketGenerator {
    #[wasm_bindgen(constructor)]
    pub fn new(seed: u32, instrument_count: u32) -> Result<MarketGenerator, JsError> {
        // Validate the instrument count.
        if !is_valid_instrument_count(instrument_count) {
            return Err(JsError::new("Instrument count must be between 1 and 50"));
        }

        // Create the instrument states.
        let mut instruments = Vec::with_capacity(instrument_count as usize);

        for _ in 0..instrument_count {
            instruments.push(InstrumentState {
                reference_price_cents: 10_000,
            });
        }

        // Return the initialized generator.
        Ok(MarketGenerator {
            random_state: if seed == 0 { 0xA341_316C } else { seed },
            instruments,
        })
    }

    pub fn next_random_u32(&mut self) -> u32 {
        let mut x = self.random_state;

        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;

        self.random_state = x;

        x
    }

    pub fn generate_batch_flat(&mut self, updates_per_batch: u32) -> Result<Box<[i64]>, JsError> {
        // Validate the requested batch size.
        if !(1..=1000).contains(&updates_per_batch) {
            return Err(JsError::new("Batch size must be between 1 and 1000"));
        }

        // Generate the market events inside Rust.
        let updates = self.generate_batch(updates_per_batch);

        // Each event contains exactly seven numeric fields.
        let mut result = Vec::with_capacity(updates.len() * 7);

        for update in updates {
            result.extend_from_slice(&[
                i64::from(update.instrument_index),
                update.price_cents,
                i64::from(update.trade_quantity),
                update.bid_cents,
                update.ask_cents,
                i64::from(update.bid_quantity),
                i64::from(update.ask_quantity),
            ]);
        }

        Ok(result.into_boxed_slice())
    }
}

impl MarketGenerator {
    fn advance_random_instrument(&mut self) -> (usize, i64) {
        // Randomly select an instrument.
        let instrument_index = (self.next_random_u32() as usize) % self.instruments.len();

        // Generate another random value for the price movement.
        let random_value = self.next_random_u32();

        // Update only the selected instrument.
        let new_price = self.instruments[instrument_index].advance_price(random_value);

        // Return the selected index and its new price.
        (instrument_index, new_price)
    }

    fn generate_one_update(&mut self) -> GeneratedMarketUpdate {
        // Select an instrument and advance its reference price.
        let (instrument_index, reference_price_cents) = self.advance_random_instrument();

        // Generate a spread between 1 and 5 cents.
        let spread_cents = i64::from(self.next_random_u32() % 5 + 1);

        // Keep enough room for a positive spread without overflow.
        let bid_cents = reference_price_cents.min(i64::MAX - 5);
        let ask_cents = bid_cents + spread_cents;

        // Execute the trade at either the bid or the ask.
        let price_cents = if self.next_random_u32() % 2 == 0 {
            bid_cents
        } else {
            ask_cents
        };

        // Generate a positive trade quantity.
        let trade_quantity = self.next_random_u32() % 100 + 1;

        // Generate non-negative order book quantities.
        let bid_quantity = self.next_random_u32() % 501;
        let ask_quantity = self.next_random_u32() % 501;

        GeneratedMarketUpdate {
            instrument_index: instrument_index as u32,
            price_cents,
            trade_quantity,
            bid_cents,
            ask_cents,
            bid_quantity,
            ask_quantity,
        }
    }

    fn generate_batch(&mut self, updates_per_batch: u32) -> Vec<GeneratedMarketUpdate> {
        // Reserve memory for the requested number of events.
        let mut updates = Vec::with_capacity(updates_per_batch as usize);

        // Generate every market event inside Rust.
        for _ in 0..updates_per_batch {
            updates.push(self.generate_one_update());
        }

        // Return the completed batch.
        updates
    }
}

#[cfg(test)]
mod tests {
    use super::{is_valid_instrument_count, InstrumentState, MarketGenerator};
    #[test]
    fn generates_deterministic_sequence() {
        // Arrange
        let mut generator_a =
            MarketGenerator::new(12345, 5).expect("Generator A should initialize");
        let mut generator_b =
            MarketGenerator::new(12345, 5).expect("Generator B should initialize");

        // Act
        let first_a = generator_a.next_random_u32();
        let first_b = generator_b.next_random_u32();

        let second_a = generator_a.next_random_u32();
        let second_b = generator_b.next_random_u32();

        // Assert
        assert_eq!(first_a, first_b);
        assert_eq!(second_a, second_b);

        assert_ne!(first_a, second_a);
    }

    #[test]
    fn initializes_requested_number_of_instruments() {
        // Arrange
        let instrument_count = 20;

        // Act
        let generator =
            MarketGenerator::new(12345, instrument_count).expect("Generator should initialize");

        // Assert
        assert_eq!(generator.instruments.len(), 20);

        assert!(generator
            .instruments
            .iter()
            .all(|instrument| instrument.reference_price_cents == 10_000));
    }

    #[test]
    fn validates_instrument_count_boundaries() {
        assert!(!is_valid_instrument_count(0));

        assert!(is_valid_instrument_count(1));

        assert!(is_valid_instrument_count(50));

        assert!(!is_valid_instrument_count(51));
    }

    #[test]
    fn advances_price_and_keeps_it_positive() {
        // Arrange
        let mut instrument = InstrumentState {
            reference_price_cents: 10_000,
        };

        // Act & Assert: price increases by 3 cents
        assert_eq!(instrument.advance_price(8), 10_003);

        // Price decreases by 2 cents
        assert_eq!(instrument.advance_price(3), 10_001);

        // Price remains unchanged
        assert_eq!(instrument.advance_price(5), 10_001);

        // Price cannot become zero or negative
        let mut low_price_instrument = InstrumentState {
            reference_price_cents: 2,
        };

        assert_eq!(low_price_instrument.advance_price(0), 1);
    }

    #[test]
    fn advances_only_the_selected_instrument() {
        // ARRANGE
        let mut generator = MarketGenerator::new(12345, 5).expect("Generator should initialize");

        let prices_before: Vec<i64> = generator
            .instruments
            .iter()
            .map(|instrument| instrument.reference_price_cents)
            .collect();

        // ACT
        let (selected_index, new_price) = generator.advance_random_instrument();

        // ASSERT
        assert!(selected_index < 5);

        assert_eq!(
            generator.instruments[selected_index].reference_price_cents,
            new_price
        );

        for (index, instrument) in generator.instruments.iter().enumerate() {
            if index != selected_index {
                assert_eq!(instrument.reference_price_cents, prices_before[index]);
            }
        }
    }

    #[test]
    fn generates_valid_market_updates() {
        // ARRANGE
        let mut generator = MarketGenerator::new(12345, 5).expect("Generator should initialize");

        // ACT & ASSERT
        for _ in 0..1000 {
            let update = generator.generate_one_update();

            // Instrument index must be valid.
            assert!(update.instrument_index < 5);

            // Prices must be positive.
            assert!(update.price_cents > 0);
            assert!(update.bid_cents > 0);
            assert!(update.ask_cents > 0);

            // Bid must always be lower than Ask.
            assert!(update.bid_cents < update.ask_cents);

            // Spread must be between 1 and 5 cents.
            let spread = update.ask_cents - update.bid_cents;
            assert!((1..=5).contains(&spread));

            // Trade price must equal Bid or Ask.
            assert!(
                update.price_cents == update.bid_cents || update.price_cents == update.ask_cents
            );

            // Trade quantity must be positive.
            assert!((1..=100).contains(&update.trade_quantity));

            // Order book quantities must be within the expected range.
            assert!(update.bid_quantity <= 500);
            assert!(update.ask_quantity <= 500);
        }
    }

    #[test]
    fn generates_batches_and_preserves_state_between_them() {
        // ARRANGE
        let mut batched =
            MarketGenerator::new(12345, 5).expect("Batched generator should initialize");

        let mut sequential =
            MarketGenerator::new(12345, 5).expect("Sequential generator should initialize");

        // ACT: generate 150 events in two batches.
        let first_batch = batched.generate_batch(100);
        let second_batch = batched.generate_batch(50);

        // ASSERT: check batch sizes.
        assert_eq!(first_batch.len(), 100);
        assert_eq!(second_batch.len(), 50);

        // Generate the same 150 events one by one.
        for _ in 0..150 {
            sequential.generate_one_update();
        }

        // Both approaches must produce the same PRNG state.
        assert_eq!(batched.random_state, sequential.random_state);

        // Every instrument must have the same final reference price.
        for (batch_instrument, sequential_instrument) in batched
            .instruments
            .iter()
            .zip(sequential.instruments.iter())
        {
            assert_eq!(
                batch_instrument.reference_price_cents,
                sequential_instrument.reference_price_cents
            );
        }
    }

    #[test]
    fn generates_valid_flat_batch() {
        // ARRANGE
        let mut generator = MarketGenerator::new(12345, 5).expect("Generator should initialize");

        // ACT
        let batch = generator
            .generate_batch_flat(100)
            .expect("Batch generation should succeed");

        // ASSERT: 100 events with 7 fields each.
        assert_eq!(batch.len(), 700);

        // Validate every event in the flat array.
        for update in batch.chunks_exact(7) {
            let instrument_index = update[0];
            let price_cents = update[1];
            let trade_quantity = update[2];
            let bid_cents = update[3];
            let ask_cents = update[4];
            let bid_quantity = update[5];
            let ask_quantity = update[6];

            assert!((0..5).contains(&instrument_index));

            assert!(price_cents > 0);
            assert!(bid_cents > 0);
            assert!(bid_cents < ask_cents);

            assert!(price_cents == bid_cents || price_cents == ask_cents);

            assert!((1..=100).contains(&trade_quantity));

            assert!((0..=500).contains(&bid_quantity));
            assert!((0..=500).contains(&ask_quantity));
        }

        // Confirm that no incomplete event remains.
        assert!(batch.chunks_exact(7).remainder().is_empty());
    }
}
