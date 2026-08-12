<?php

if (!defined('__TYPECHO_ROOT_DIR__')) {
    exit;
}

$archiveLabel = terminal_archive_label($this);
$this->need('header.php');
?>
<section class="terminal-listing">
    <p class="document-command">$ find ./posts -type f<?php if ($archiveLabel): ?> -query <?php echo terminal_escape($archiveLabel); ?><?php endif; ?></p>
    <?php if ($this->have()): ?>
        <ul class="archive-files">
            <?php while ($this->next()): ?>
                <li>
                    <time datetime="<?php $this->date('c'); ?>"><?php $this->date('Y-m-d'); ?></time>
                    <a href="<?php $this->permalink(); ?>"><?php echo terminal_escape($this->slug); ?>.md</a>
                    <span><?php $this->title(); ?></span>
                </li>
            <?php endwhile; ?>
        </ul>
        <nav class="archive-nav" aria-label="Archive pages">
            <?php $this->pageNav('previous', 'next'); ?>
        </nav>
    <?php else: ?>
        <p class="terminal-warning">find: no matching documents</p>
    <?php endif; ?>
</section>
<?php $this->need('footer.php'); ?>
