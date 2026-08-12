            </section>
            <form class="terminal-command" id="terminal-command" autocomplete="off">
                <label class="terminal-prompt" for="terminal-input">
                    <span class="prompt-user"><?php echo terminal_escape($terminalContext['terminal']['user']); ?>@<?php echo terminal_escape($terminalContext['terminal']['host']); ?></span><span class="prompt-separator">:</span><span class="prompt-path">~/blog</span><span class="prompt-symbol">$</span>
                </label>
                <input id="terminal-input" name="command" type="text" enterkeyhint="send" spellcheck="false" aria-label="Terminal command">
            </form>
        </div>
    </section>
</main>
<script id="terminal-context" type="application/json"><?php echo terminal_json($terminalContext); ?></script>
<script src="<?php $this->options->themeUrl('assets/terminal.js'); ?>" defer></script>
<?php $this->footer(); ?>
</body>
</html>
