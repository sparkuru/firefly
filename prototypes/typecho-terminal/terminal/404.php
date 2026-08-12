<?php

if (!defined('__TYPECHO_ROOT_DIR__')) {
    exit;
}

$this->need('header.php');
?>
<section class="terminal-error" role="alert">
    <p class="document-command">$ cat requested-resource</p>
    <p>cat: requested-resource: No such file or directory</p>
    <p>Run <button class="command-link" type="button" data-command="ls">ls</button> to inspect available documents.</p>
</section>
<?php $this->need('footer.php'); ?>

