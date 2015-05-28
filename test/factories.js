var emailCounter = 0;

function email(i) {
    if (typeof i === 'undefined') {
        emailCounter++;
        i = emailCounter;
    }
    return "foo" + i + "@bar.com";
}

function password() {
    return "foobar";
}

function name() {
    return "Foo Bar";
}

module.exports = {
    email: email,
    password: password,
    name: name
};
