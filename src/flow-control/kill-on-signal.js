const { map, tap } = require('rxjs/operators');


module.exports = class KillOnSignal {
    constructor({ process }) {
        this.process = process;
    }

    handle(commands) {
        let caughtSignal;
        const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'];
        const handlers = signals.map(signal => {
            return () => {
                caughtSignal = signal;
                commands.forEach(command => command.kill(signal));
            };
        });
        signals.forEach((signal, index) => {
            const handler = handlers[index];
            this.process.on(signal, handler);
        });
        const cleanupListeners = () => {
            signals.forEach((signal, index) => {
                const handler = handlers[index];
                this.process.removeListener(signal, handler);
            });
        };
        const commandsLength = commands.length;
        let closedCommands = 0;

        return commands.map(command => {
            const cleanup = () => {
                closedCommands += 1;
                if (closedCommands === commandsLength) {
                    cleanupListeners();
                }
            };
            const convertCaughtSignal = (value) => caughtSignal === 'SIGINT' ? 0 : value;
            const closeStream = command.close.pipe(tap(cleanup)).pipe(map(convertCaughtSignal));
            return new Proxy(command, {
                get(target, prop) {
                    return prop === 'close' ? closeStream : target[prop];
                }
            });
        });
    }
};
