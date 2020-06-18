const EventEmitter = require('events');

const createFakeCommand = require('./fixtures/fake-command');
const KillOnSignal = require('./kill-on-signal');

let commands, controller, process;
beforeEach(() => {
    process = new EventEmitter();
    commands = [
        createFakeCommand(),
        createFakeCommand(),
    ];
    controller = new KillOnSignal({ process });
});

let newCommands;

function subscribe() {
    newCommands.map(command => command.close.subscribe(() => {}));
}

it('returns commands that keep non-close streams from original commands', () => {
    newCommands = controller.handle(commands);
    newCommands.forEach((newCommand, i) => {
        expect(newCommand.close).not.toBe(commands[i].close);
        expect(newCommand.error).toBe(commands[i].error);
        expect(newCommand.stdout).toBe(commands[i].stdout);
        expect(newCommand.stderr).toBe(commands[i].stderr);
    });
});

it('returns commands that map SIGINT to exit code 0', () => {
    newCommands = controller.handle(commands);
    expect(newCommands).not.toBe(commands);
    expect(newCommands).toHaveLength(commands.length);

    const callback = jest.fn();
    newCommands[0].close.subscribe(callback);
    process.emit('SIGINT');

    // A fake command's .kill() call won't trigger a close event automatically...
    commands[0].close.next(1);

    expect(callback).not.toHaveBeenCalledWith('SIGINT');
    expect(callback).toHaveBeenCalledWith(0);
});

it('returns commands that keep non-SIGINT exit codes', () => {
    newCommands = controller.handle(commands);
    expect(newCommands).not.toBe(commands);
    expect(newCommands).toHaveLength(commands.length);

    const callback = jest.fn();
    newCommands[0].close.subscribe(callback);
    commands[0].close.next(1);

    expect(callback).toHaveBeenCalledWith(1);
});

it('kills all commands on SIGINT', () => {
    expect(process.listenerCount('SIGINT')).toBe(0);
    newCommands = controller.handle(commands);
    subscribe();
    process.emit('SIGINT');

    expect(process.listenerCount('SIGINT')).toBe(0);
    expect(commands[0].kill).toHaveBeenCalledWith('SIGINT');
    expect(commands[1].kill).toHaveBeenCalledWith('SIGINT');
});

it('kills all commands on SIGTERM', () => {
    newCommands = controller.handle(commands);
    subscribe();
    process.emit('SIGTERM');

    expect(process.listenerCount('SIGTERM')).toBe(0);
    expect(commands[0].kill).toHaveBeenCalledWith('SIGTERM');
    expect(commands[1].kill).toHaveBeenCalledWith('SIGTERM');
});

it('kills all commands on SIGHUP', () => {
    newCommands = controller.handle(commands);
    subscribe();
    process.emit('SIGHUP');

    expect(process.listenerCount('SIGHUP')).toBe(0);
    expect(commands[0].kill).toHaveBeenCalledWith('SIGHUP');
    expect(commands[1].kill).toHaveBeenCalledWith('SIGHUP');
});
