use std::cmp::Ordering;
use wasm_bindgen::prelude::*;
use crate::rs::util::range::Range;

#[wasm_bindgen]
pub struct Replacement {
    position: Range,
    substitute: String,

    original_substitute: String,
    target_note_path: String,
}

#[wasm_bindgen]
impl Replacement {
    #[wasm_bindgen(constructor)]
    pub fn new(position: Range, substitute: String, original_substitute: String, target_note_path: String) -> Self {
        Replacement {
            position,
            substitute,
            original_substitute,
            target_note_path
        }
    }

    #[wasm_bindgen(getter)]
    pub fn position(&self) -> Range {self.position.clone()}
    #[wasm_bindgen(getter)]
    pub fn substitute(&self) -> String { self.substitute.clone() }
    #[wasm_bindgen(getter, js_name = "originalSubstitute")]
    pub fn original_substitute(&self) -> String { self.original_substitute.clone() }
    #[wasm_bindgen(getter, js_name = "targetNotePath")]
    pub fn target_note_path(&self) -> String { self.target_note_path.clone() }
}