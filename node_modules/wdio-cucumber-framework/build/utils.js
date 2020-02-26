'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.createStepArgument = createStepArgument;
function createStepArgument(_ref) {
    var argument = _ref.argument;

    if (!argument) {
        return undefined;
    }
    if (argument.type === 'DataTable') {
        return [{ rows: argument.rows.map(function (row) {
                return { cells: row.cells.map(function (cell) {
                        return cell.value;
                    }) };
            }) }];
    }
    if (argument.type === 'DocString') {
        return argument.content;
    }
    return undefined;
}