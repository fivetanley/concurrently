const { createMockInstance } = require('jest-create-mock-instance');
const { Writable } = require('stream');
const { Subject } = require('rxjs');
const { tap } = require('rxjs/operators');

module.exports = (name = 'foo', command = 'echo foo', index = 0) => {
    let close = new Subject();
    close = close.pipe(tap(() => fakeCommand.killable = false));
    const fakeCommand = {
        index,
        name,
        command,
        killable: true,
        close,
        error: new Subject(),
        stderr: new Subject(),
        stdout: new Subject(),
        stdin: createMockInstance(Writable),
        start: jest.fn(),
        kill: jest.fn().mockImplementation((signal) => {
            if (fakeCommand.killable) {
                fakeCommand.killable = false;
                fakeCommand.close.next(signal);
            }
        })
    };
    return fakeCommand;
};
