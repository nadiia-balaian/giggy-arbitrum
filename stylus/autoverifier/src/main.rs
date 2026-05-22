// Empty bin entrypoint required by cargo-stylus 0.10. The real contract
// lives in lib.rs; this just satisfies the deploy command's bin-target
// requirement and forwards `cargo stylus export-abi` to the library.
#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]

#[cfg(not(any(test, feature = "export-abi")))]
#[unsafe(no_mangle)]
pub extern "C" fn main() {}

#[cfg(feature = "export-abi")]
fn main() {
    autoverifier_stylus::print_from_args();
}
