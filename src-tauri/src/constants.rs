use include_dir::{include_dir, Dir};

pub static ENGINE_DIR: Dir<'_> = include_dir!("$CARGO_MANIFEST_DIR/engine");

pub const CREATE_NO_WINDOW: u32 = 0x0800_0000;

pub const REQUIRED_FILES: &[&str] = &[
    "bin/winws.exe",
    "bin/WinDivert.dll",
    "bin/WinDivert64.sys",
    "bin/cygwin1.dll",
    "general_silent.bat",
    "general (ALT)_silent.bat",
    "general (ALT2)_silent.bat",
    "general (ALT3)_silent.bat",
    "general (ALT4)_silent.bat",
    "general (ALT5)_silent.bat",
    "general (ALT6)_silent.bat",
    "general (ALT7)_silent.bat",
    "general (ALT8)_silent.bat",
    "general (ALT9)_silent.bat",
    "general (ALT10)_silent.bat",
    "general (ALT11)_silent.bat",
    "general (FAKE TLS AUTO)_silent.bat",
    "general (FAKE TLS AUTO ALT)_silent.bat",
    "general (FAKE TLS AUTO ALT2)_silent.bat",
    "general (FAKE TLS AUTO ALT3)_silent.bat",
    "general (SIMPLE FAKE)_silent.bat",
    "general (SIMPLE FAKE ALT)_silent.bat",
    "general (SIMPLE FAKE ALT2)_silent.bat",
];
