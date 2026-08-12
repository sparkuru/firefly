<?php

if (!defined('__TYPECHO_ROOT_DIR__')) {
    exit;
}

$this->need('header.php');
?>
<article class="terminal-document" data-document-slug="<?php echo terminal_escape($this->slug); ?>" itemscope itemtype="https://schema.org/WebPage">
    <header class="document-header">
        <p class="document-command">$ cat <?php echo terminal_escape($this->slug); ?>.md</p>
        <h1 itemprop="name"><?php $this->title(); ?></h1>
    </header>
    <div class="document-body" itemprop="mainContentOfPage">
        <?php $this->content(); ?>
    </div>
    <?php $this->need('comments.php'); ?>
</article>
<?php $this->need('footer.php'); ?>

