// VirtualKeyboard stub for export_package
// Real implementation is only used on Terminal/Kiosk devices
// This stub prevents import errors when enableVirtualKeyboard is false

import React from 'react';

function VirtualKeyboard() {
  // This component should never render in export_package
  // deviceProfile.enableVirtualKeyboard is false
  return null;
}

export default VirtualKeyboard;
