---
name: mobile-mcp
description: >-
  Use this skill when interacting with, testing, inspecting, or automating mobile applications (iOS/Android emulators, simulators, or real physical devices) using the Mobile Next Model Context Protocol (MCP) server.
---

# Mobile MCP Automation Guide

The `mobile-mcp` server connects LLMs and agents to mobile devices (Android emulators, real USB-connected phones, and iOS simulators/devices).

## Key Capabilities & Tools

### 1. Device Discovery & State
- `mobile_list_available_devices`: Discovers booted Android emulators, USB-connected devices (via `adb`), or cloud devices.
- `mobile_get_screen_size`: Retrieves width and height in hardware pixels.
- `mobile_get_orientation` & `mobile_set_orientation`: Inspects or changes portrait/landscape orientation.
- `mobile_clipboard`: Reads or updates the clipboard content.

### 2. App Lifecycle
- `mobile_list_apps`: Lists all installed packages on the target device.
- `mobile_get_foreground_app`: Detects which application is currently active.
- `mobile_launch_app`: Launches an app (e.g., `com.example.anikage`).
- `mobile_terminate_app`: Force-stops a package.
- `mobile_install_app`: Installs a local `.apk` onto the device.
- `mobile_uninstall_app`: Uninstalls a package.

### 3. Screen Inspection & Interaction
- `mobile_take_screenshot` / `mobile_save_screenshot`: Captures the live screen.
- `mobile_list_elements_on_screen`: Accessibility-first inspection of UI elements with their bounds and identifiers.
- `mobile_click_on_screen_at_coordinates`: Taps an element by accessibility ref or X,Y coordinates.
- `mobile_double_tap_on_screen` / `mobile_long_press_on_screen_at_coordinates`: Specialized gestures.
- `mobile_swipe_on_screen`: Swipes up, down, left, or right.
- `mobile_type_keys`: Types text into the currently focused input.
- `mobile_press_button`: Sends hardware key events (`BACK`, `HOME`, `VOLUME_UP`, `VOLUME_DOWN`, `ENTER`).

### 4. Diagnostics & Logs
- `mobile_get_device_logs`: Fetches Android `logcat` stream.
- `mobile_list_crashes` & `mobile_get_crash`: Retrieves Android crash tombstones / stack traces.
- `mobile_batch_commands`: Executes an ordered sequence of taps and key presses in a single call.
