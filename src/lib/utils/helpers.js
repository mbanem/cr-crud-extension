"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.capitalize = void 0;
const capitalize = (str) => {
    return str
        .replace(/\b[a-z](?=[a-z]{2})/g, (char) => char.toUpperCase());
};
exports.capitalize = capitalize;
//# sourceMappingURL=helpers.js.map