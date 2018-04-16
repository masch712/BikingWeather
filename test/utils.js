exports.mockAlexa = function mockAlexa() {
    return {
        response: {
            speak: jest.fn()
        },
        emit: jest.fn()
    };
};