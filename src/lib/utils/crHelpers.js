"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetButtons = exports.sleep = void 0;
const sleep = async (ms) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            // ms here is a dummy but required by
            // resolve to send out some value
            resolve(ms);
        }, ms);
    });
};
exports.sleep = sleep;
const resetButtons = (buttons) => {
    try {
        buttons.forEach((btn) => {
            btn.classList.remove('hidden');
            btn.classList.add('hidden');
            try {
                btn.hidden = true;
            }
            finally {
            }
        });
    }
    catch { }
};
exports.resetButtons = resetButtons;
//# sourceMappingURL=crHelpers.js.map