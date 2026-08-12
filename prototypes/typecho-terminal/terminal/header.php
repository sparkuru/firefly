<?php

if (!defined('__TYPECHO_ROOT_DIR__')) {
    exit;
}

$terminalContext = terminal_context($this);
$terminalKind = $terminalContext['page']['kind'];
$terminalTitle = $terminalContext['site']['title'];
if ($terminalContext['page']['document']) {
    $terminalTitle = $terminalContext['page']['document']['title'] . ' — ' . $terminalTitle;
}
?>
<!doctype html>
<html lang="zh-CN">
<head>
    <meta charset="<?php $this->options->charset(); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#070b09">
    <title><?php echo terminal_escape($terminalTitle); ?></title>
    <link rel="stylesheet" href="<?php $this->options->themeUrl('assets/terminal.css'); ?>">
    <style>:root { --accent: <?php echo terminal_escape(terminal_accent_color($this->options)); ?>; }</style>
    <?php $this->header(); ?>
</head>
<body data-page-kind="<?php echo terminal_escape($terminalKind); ?>">
<main class="terminal-stage">
    <section class="terminal-window" aria-label="Interactive blog terminal">
        <header class="terminal-titlebar">
            <div class="terminal-lights" aria-hidden="true">
                <span></span><span></span><span></span>
            </div>
            <a class="terminal-title" href="<?php $this->options->siteUrl(); ?>">
                <?php echo terminal_escape($terminalContext['terminal']['user']); ?>@<?php echo terminal_escape($terminalContext['terminal']['host']); ?>:~/blog
            </a>
            <span class="terminal-status">SSH</span>
        </header>
        <div class="terminal-screen" id="terminal-screen">
            <section class="terminal-output" id="terminal-output" aria-live="polite">

