module.exports = function(value) {
    switch (typeof value) {
        case 'number':
            return true;
        case 'string':
            return !isNaN(Date.parse(value));
        case 'object':
            if (value instanceof Date) {
                return !isNaN(value.getTime());
            }
        default:
            return false;
    }
}