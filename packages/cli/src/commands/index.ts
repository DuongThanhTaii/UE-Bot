// Use V2 commands with full Agent Core integration
export { chatCommand } from './chat-v2.js';
export { configCommand } from './config.js';
export { runCommand } from './run-v2.js';

// Legacy commands (without Agent Core tools)
export { chatCommand as chatCommandLegacy } from './chat.js';
export { runCommand as runCommandLegacy } from './run.js';
