function formatErrors(err) {
    var errors = [];
    for (var i = 0; i < Object.keys(err.errors).length; i++) {
        var error = err.errors[Object.keys(err.errors)[i]];

        if (error.kind === 'required') {
            errors.push(error.path + '_required');
        } else if (error.kind === 'regexp') {
            errors.push('invalid_' + error.path);
        } else if (error.message.indexOf('expected `email` to be unique') >= 0) {
            errors.push('user_already_exists');
        } else {
            console.log(error);
            errors.push('unknown_error');
        }
    }

    return errors;
}

module.exports = formatErrors;
