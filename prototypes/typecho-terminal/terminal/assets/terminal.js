(() => {
    'use strict';

    const contextNode = document.getElementById('terminal-context');
    const output = document.getElementById('terminal-output');
    const form = document.getElementById('terminal-command');
    const input = document.getElementById('terminal-input');
    const screen = document.getElementById('terminal-screen');

    if (!contextNode || !output || !form || !input || !screen) {
        return;
    }

    let context;
    try {
        context = JSON.parse(contextNode.textContent || '{}');
    } catch {
        return;
    }

    const initialView = Array.from(output.childNodes, (node) => node.cloneNode(true));
    const history = [];
    let historyIndex = 0;

    const commandNames = ['about', 'cat', 'clear', 'date', 'help', 'history', 'ls', 'pwd', 'whoami'];

    const scrollToPrompt = () => {
        window.requestAnimationFrame(() => {
            screen.scrollTop = screen.scrollHeight;
        });
    };

    const makeLine = (text, className = '') => {
        const line = document.createElement('div');
        line.className = `terminal-line ${className}`.trim();
        line.textContent = text;
        return line;
    };

    const print = (text, className = '') => {
        String(text).split('\n').forEach((line) => output.append(makeLine(line, className)));
        scrollToPrompt();
    };

    const printPrompt = (command) => {
        const line = document.createElement('div');
        line.className = 'terminal-line terminal-echo';

        const prompt = document.createElement('span');
        prompt.className = 'inline-prompt';
        prompt.textContent = `${context.terminal.user}@${context.terminal.host}:~/blog$ `;

        const value = document.createElement('span');
        value.textContent = command;

        line.append(prompt, value);
        output.append(line);
    };

    const tokenize = (source) => {
        const tokens = [];
        const pattern = /"([^"]*)"|'([^']*)'|([^\s]+)/g;
        let match;
        while ((match = pattern.exec(source)) !== null) {
            tokens.push(match[1] ?? match[2] ?? match[3]);
        }
        return tokens;
    };

    const normalizedTarget = (target) => {
        let value = String(target).trim().replace(/^\.\//, '');
        value = value.replace(/^(posts|pages)\//, '');
        try {
            value = decodeURIComponent(value);
        } catch {
            return value.toLowerCase();
        }
        return value.toLowerCase();
    };

    const findFile = (target) => {
        const normalized = normalizedTarget(target);
        const withoutExtension = normalized.replace(/\.md$/i, '');

        return context.files.find((file) => {
            const candidates = [file.filename, file.slug, file.title].map((value) => String(value).toLowerCase());
            return candidates.includes(normalized) || candidates.includes(withoutExtension);
        });
    };

    const replaceWithInitialView = () => {
        output.replaceChildren(...initialView.map((node) => node.cloneNode(true)));
        scrollToPrompt();
    };

    const printFileList = (files) => {
        if (!files.length) {
            print('ls: directory is empty', 'terminal-warning');
            return;
        }

        const list = document.createElement('div');
        list.className = 'terminal-file-list';

        files.forEach((file) => {
            const row = document.createElement('div');
            row.className = 'terminal-file-row';

            const mode = document.createElement('span');
            mode.textContent = file.type === 'page' ? '-r--r--r--' : '-rw-r--r--';

            const date = document.createElement('time');
            date.dateTime = file.date;
            date.textContent = file.date;

            const link = document.createElement('a');
            link.href = file.url;
            link.textContent = file.filename;

            const title = document.createElement('span');
            title.className = 'terminal-file-title';
            title.textContent = file.title;

            row.append(mode, date, link, title);
            list.append(row);
        });

        output.append(list);
        print(`${files.length} document${files.length === 1 ? '' : 's'}`);
    };

    const commands = {
        help() {
            print([
                'available commands:',
                '  ls [posts|pages]  list Markdown documents',
                '  cat <file>.md     render a document',
                '  about             inspect this site',
                '  pwd               print working directory',
                '  whoami            print terminal identity',
                '  date              print local time',
                '  history           print command history',
                '  clear             clear terminal output',
                '',
                'keyboard: ArrowUp/ArrowDown history · Tab completion · Ctrl+L clear',
            ].join('\n'));
        },

        ls(args) {
            const target = args.find((arg) => !arg.startsWith('-')) || '';
            let files = context.files;
            if (target === 'posts') {
                files = files.filter((file) => file.type === 'post');
            } else if (target === 'pages') {
                files = files.filter((file) => file.type === 'page');
            } else if (target) {
                print(`ls: cannot access '${target}': No such directory`, 'terminal-error-text');
                return;
            }
            printFileList(files);
        },

        cat(args) {
            if (!args.length) {
                print('cat: missing operand\nusage: cat <file>.md', 'terminal-warning');
                return;
            }

            const file = findFile(args.join(' '));
            if (!file) {
                print(`cat: ${args.join(' ')}: No such file or directory`, 'terminal-error-text');
                return;
            }

            const current = context.page.document;
            if (current && current.slug === file.slug && initialView.length) {
                replaceWithInitialView();
                return;
            }

            window.location.assign(file.url);
        },

        about() {
            print(context.site.title, 'terminal-accent');
            if (context.site.description) {
                print(context.site.description);
            }
            print(context.terminal.aboutText);

            const aboutPage = context.files.find((file) => file.type === 'page' && file.slug.toLowerCase() === 'about');
            if (aboutPage) {
                print(`full document: cat ${aboutPage.filename}`, 'terminal-muted');
            }
        },

        pwd() {
            print(`/home/${context.terminal.user}/blog`);
        },

        whoami() {
            print(context.terminal.user);
        },

        date() {
            print(new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'long' }).format(new Date()));
        },

        history() {
            if (!history.length) {
                return;
            }
            history.forEach((command, index) => print(`${String(index + 1).padStart(4, ' ')}  ${command}`));
        },

        clear() {
            output.replaceChildren();
        },
    };

    const run = (source, echo = true) => {
        const commandLine = source.trim();
        if (!commandLine) {
            return;
        }

        if (echo) {
            printPrompt(commandLine);
        }

        const [name, ...args] = tokenize(commandLine);
        const command = commands[name.toLowerCase()];
        if (!command) {
            print(`${name}: command not found. Type help.`, 'terminal-error-text');
            scrollToPrompt();
            return;
        }

        command(args);
        scrollToPrompt();
    };

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const command = input.value;
        input.value = '';
        if (command.trim()) {
            history.push(command.trim());
            historyIndex = history.length;
        }
        run(command);
    });

    input.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowUp' && history.length) {
            event.preventDefault();
            historyIndex = Math.max(0, historyIndex - 1);
            input.value = history[historyIndex];
        }

        if (event.key === 'ArrowDown' && history.length) {
            event.preventDefault();
            historyIndex = Math.min(history.length, historyIndex + 1);
            input.value = historyIndex === history.length ? '' : history[historyIndex];
        }

        if (event.key === 'Tab') {
            const partial = input.value.trim().toLowerCase();
            const matches = commandNames.filter((name) => name.startsWith(partial));
            if (matches.length === 1) {
                event.preventDefault();
                input.value = matches[0];
            }
        }

        if (event.ctrlKey && event.key.toLowerCase() === 'l') {
            event.preventDefault();
            commands.clear();
        }
    });

    output.addEventListener('click', (event) => {
        const trigger = event.target.closest('[data-command]');
        if (!trigger) {
            return;
        }
        run(trigger.dataset.command || '');
        input.focus();
    });

    screen.addEventListener('click', (event) => {
        if (!event.target.closest('a, button, input, textarea, label')) {
            input.focus();
        }
    });

    if (!initialView.some((node) => node.nodeType === Node.ELEMENT_NODE)) {
        print(`${context.site.title} :: terminal blog`, 'terminal-accent');
        print(context.terminal.bootMessage);
    }

    input.focus({ preventScroll: true });
    scrollToPrompt();
})();

