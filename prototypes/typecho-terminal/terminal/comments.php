<?php

if (!defined('__TYPECHO_ROOT_DIR__')) {
    exit;
}
?>
<section class="terminal-comments" id="comments">
    <?php $this->comments()->to($comments); ?>
    <?php if ($comments->have()): ?>
        <h2><?php $this->commentsNum('0 comments', '1 comment', '%d comments'); ?></h2>
        <?php $comments->listComments(); ?>
        <nav class="comments-nav" aria-label="Comment pages">
            <?php $comments->pageNav('previous', 'next'); ?>
        </nav>
    <?php endif; ?>

    <?php if ($this->allow('comment')): ?>
        <section id="<?php $this->respondId(); ?>" class="comment-respond">
            <?php $comments->cancelReply(); ?>
            <h2>append comment.log</h2>
            <form method="post" action="<?php $this->commentUrl(); ?>" id="comment-form">
                <?php if ($this->user->hasLogin()): ?>
                    <p>identity: <a href="<?php $this->options->profileUrl(); ?>"><?php $this->user->screenName(); ?></a> · <a href="<?php $this->options->logoutUrl(); ?>">logout</a></p>
                <?php else: ?>
                    <div class="comment-fields">
                        <label>name<input type="text" name="author" value="<?php $this->remember('author'); ?>" required></label>
                        <label>email<input type="email" name="mail" value="<?php $this->remember('mail'); ?>"<?php if ($this->options->commentsRequireMail): ?> required<?php endif; ?>></label>
                        <label>url<input type="url" name="url" value="<?php $this->remember('url'); ?>"<?php if ($this->options->commentsRequireURL): ?> required<?php endif; ?>></label>
                    </div>
                <?php endif; ?>
                <label>message<textarea name="text" rows="7" required><?php $this->remember('text'); ?></textarea></label>
                <button type="submit">write</button>
            </form>
        </section>
    <?php else: ?>
        <p>comments: read-only filesystem</p>
    <?php endif; ?>
</section>
