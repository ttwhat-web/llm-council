// Prevents an additional console window on Windows in release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    CustomMenuItem, GlobalShortcutManager, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu,
    SystemTrayMenuItem,
};

const SHORTCUT: &str = "CmdOrCtrl+Shift+P";

fn build_tray() -> SystemTray {
    let toggle = CustomMenuItem::new("toggle".to_string(), "Show / Hide");
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let menu = SystemTrayMenu::new()
        .add_item(toggle)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);
    SystemTray::new().with_menu(menu)
}

fn toggle_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_window("floating") {
        match window.is_visible() {
            Ok(true) => {
                let _ = window.hide();
            }
            _ => {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
    }
}

fn main() {
    tauri::Builder::default()
        .system_tray(build_tray())
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick { .. } => toggle_window(app),
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "toggle" => toggle_window(app),
                "quit" => app.exit(0),
                _ => {}
            },
            _ => {}
        })
        .setup(|app| {
            let handle = app.handle();
            let mut shortcuts = handle.global_shortcut_manager();
            // Best-effort registration; if the shortcut is already taken we don't crash.
            let _ = shortcuts.register(SHORTCUT, move || toggle_window(&handle));
            Ok(())
        })
        .on_window_event(|event| {
            // Hide instead of quitting when the user closes the floating window.
            if let tauri::WindowEvent::CloseRequested { api, .. } = event.event() {
                let _ = event.window().hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running PromptFixer Sidekick");
}
