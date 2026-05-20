// Prevents an additional console window on Windows in release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    CustomMenuItem, GlobalShortcutManager, Manager, SystemTray, SystemTrayEvent,
    SystemTrayMenu, SystemTrayMenuItem,
};

mod runtime;

const CMDK_SHORTCUT: &str = "CmdOrCtrl+K";
const OVERLAY_SHORTCUT: &str = "CmdOrCtrl+Shift+O";

fn build_tray() -> SystemTray {
    let main_item = CustomMenuItem::new("show-main".to_string(), "Show Main Window");
    let overlay_item = CustomMenuItem::new("toggle-overlay".to_string(), "Toggle Overlay");
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let menu = SystemTrayMenu::new()
        .add_item(main_item)
        .add_item(overlay_item)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);
    SystemTray::new().with_menu(menu)
}

fn show_window(app: &tauri::AppHandle, label: &str) {
    if let Some(w) = app.get_window(label) {
        let _ = w.show();
        let _ = w.set_focus();
    }
}

fn toggle_overlay(app: &tauri::AppHandle) {
    if let Some(w) = app.get_window("overlay") {
        match w.is_visible() {
            Ok(true) => {
                let _ = w.hide();
            }
            _ => {
                let _ = w.show();
                let _ = w.set_focus();
            }
        }
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            runtime::runtime_ping,
            runtime::runtime_get_env_status,
            runtime::runtime_telegram_send,
            runtime::runtime_telegram_poll_once,
            runtime::runtime_provider_fetch
        ])
        .system_tray(build_tray())
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick { .. } => show_window(app, "main"),
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "show-main" => show_window(app, "main"),
                "toggle-overlay" => toggle_overlay(app),
                "quit" => app.exit(0),
                _ => {}
            },
            _ => {}
        })
        .setup(|app| {
            let handle = app.handle();
            let mut shortcuts = handle.global_shortcut_manager();
            // ⌘K — focus the main window. The web app handles the actual palette.
            let main_handle = handle.clone();
            let _ = shortcuts.register(CMDK_SHORTCUT, move || {
                show_window(&main_handle, "main");
            });
            // ⌘⇧O — toggle the floating overlay.
            let overlay_handle = handle.clone();
            let _ = shortcuts.register(OVERLAY_SHORTCUT, move || {
                toggle_overlay(&overlay_handle);
            });
            Ok(())
        })
        .on_window_event(|event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event.event() {
                // Hide secondary windows instead of quitting.
                if event.window().label() == "overlay" {
                    let _ = event.window().hide();
                    api.prevent_close();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running PromptReady OS");
}
