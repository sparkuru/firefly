<?php

if (!defined('__TYPECHO_ROOT_DIR__')) {
    exit;
}

$this->need('header.php');
?>
<article class="terminal-document" data-document-slug="<?php echo terminal_escape($this->slug); ?>" itemscope itemtype="https://schema.org/BlogPosting">
    <header class="document-header">
        <p class="document-command">$ cat <?php echo terminal_escape($this->slug); ?>.md</p>
        <h1 itemprop="headline"><?php $this->title(); ?></h1>
        <p class="document-meta">
            <time datetime="<?php $this->date('c'); ?>" itemprop="datePublished"><?php $this->date('Y-m-d'); ?></time>
            <span>·</span>
            <span><?php $this->category(', '); ?></span>
        </p>
    </header>
    <div class="document-body" itemprop="articleBody">
        <?php $this->content(); ?>
    </div>
    <footer class="document-footer">
        <p class="document-tags">tags: <?php $this->tags(', ', true, 'none'); ?></p>
        <nav class="document-near" aria-label="Adjacent posts">
            <span>prev: <?php $this->thePrev('%s', 'none'); ?></span>
            <span>next: <?php $this->theNext('%s', 'none'); ?></span>
        </nav>
    </footer>
    <?php $this->need('comments.php'); ?>
</article>
<?php $this->need('footer.php'); ?>

