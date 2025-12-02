const deviceProfile = {
  /**
   * Terminal (Raspberry Pi) scoreboard build uses the virtual keyboard
   * to allow USB keypad-free player edits. Set this to false in
   * distribution bundles (export_package) until the feature is needed.
   */
  enableVirtualKeyboard: true
};

export default deviceProfile;
