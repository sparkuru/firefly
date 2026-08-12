<?php

if (!defined('__TYPECHO_ROOT_DIR__')) {
    exit;
}

function themeConfig($form)
{
    $terminalUser = new \Typecho\Widget\Helper\Form\Element\Text(
        'terminalUser',
        null,
        'guest',
        _t('Terminal user')
    );
    $form->addInput($terminalUser);

    $terminalHost = new \Typecho\Widget\Helper\Form\Element\Text(
        'terminalHost',
        null,
        'blog',
        _t('Terminal host')
    );
    $form->addInput($terminalHost);

    $accentColor = new \Typecho\Widget\Helper\Form\Element\Text(
        'accentColor',
        null,
        '#63f59a',
        _t('Accent color'),
        _t('Use a six-digit hexadecimal color, for example #63f59a.')
    );
    $form->addInput($accentColor);

    $bootMessage = new \Typecho\Widget\Helper\Form\Element\Text(
        'bootMessage',
        null,
        'Session established. Type help to inspect available commands.',
        _t('Boot message')
    );
    $form->addInput($bootMessage);

    $aboutText = new \Typecho\Widget\Helper\Form\Element\Textarea(
        'aboutText',
        null,
        'A quiet place for notes, experiments, and field logs.',
        _t('About text')
    );
    $form->addInput($aboutText);
}

function terminal_escape($value)
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function terminal_plain_text($value)
{
    return trim(html_entity_decode(strip_tags((string) $value), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
}

function terminal_option($options, $name, $fallback)
{
    $value = $options->{$name};
    if (!is_scalar($value) || trim((string) $value) === '') {
        return $fallback;
    }

    return trim((string) $value);
}

function terminal_capture($callback)
{
    ob_start();
    $callback();
    return trim((string) ob_get_clean());
}

function terminal_entry($widget, $type)
{
    $slug = terminal_plain_text($widget->slug);

    return [
        'type' => $type,
        'slug' => $slug,
        'filename' => $slug . '.md',
        'title' => terminal_plain_text($widget->title),
        'url' => (string) $widget->permalink,
        'date' => date('Y-m-d', (int) $widget->created),
    ];
}

function terminal_collect_files()
{
    $files = [];

    \Widget\Contents\Post\Recent::alloc('pageSize=200')->to($posts);
    while ($posts->next()) {
        $files[] = terminal_entry($posts, 'post');
    }

    \Widget\Contents\Page\Rows::alloc()->to($pages);
    while ($pages->next()) {
        $files[] = terminal_entry($pages, 'page');
    }

    return $files;
}

function terminal_archive_label($widget)
{
    if (!$widget->is('archive')) {
        return '';
    }

    return terminal_plain_text(terminal_capture(function () use ($widget) {
        $widget->archiveTitle([
            'category' => _t('category: %s'),
            'search' => _t('search: %s'),
            'tag' => _t('tag: %s'),
            'author' => _t('author: %s'),
        ], '', '');
    }));
}

function terminal_page_kind($widget)
{
    foreach (['post', 'page', 'archive', '404', 'index'] as $kind) {
        if ($widget->is($kind)) {
            return $kind;
        }
    }

    return 'index';
}

function terminal_current_document($widget, $kind)
{
    if ($kind !== 'post' && $kind !== 'page') {
        return null;
    }

    return terminal_entry($widget, $kind);
}

function terminal_context($widget)
{
    $options = $widget->options;
    $kind = terminal_page_kind($widget);

    return [
        'site' => [
            'title' => terminal_plain_text($options->title),
            'description' => terminal_plain_text($options->description),
            'url' => (string) $options->siteUrl,
        ],
        'terminal' => [
            'user' => terminal_option($options, 'terminalUser', 'guest'),
            'host' => terminal_option($options, 'terminalHost', 'blog'),
            'bootMessage' => terminal_option(
                $options,
                'bootMessage',
                'Session established. Type help to inspect available commands.'
            ),
            'aboutText' => terminal_option(
                $options,
                'aboutText',
                'A quiet place for notes, experiments, and field logs.'
            ),
        ],
        'page' => [
            'kind' => $kind,
            'label' => terminal_archive_label($widget),
            'document' => terminal_current_document($widget, $kind),
        ],
        'files' => terminal_collect_files(),
    ];
}

function terminal_json($value)
{
    $json = json_encode(
        $value,
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
        | JSON_HEX_TAG
        | JSON_HEX_AMP
        | JSON_HEX_APOS
        | JSON_HEX_QUOT
    );

    return $json === false ? '{}' : $json;
}

function terminal_accent_color($options)
{
    $color = terminal_option($options, 'accentColor', '#63f59a');
    return preg_match('/^#[0-9a-fA-F]{6}$/', $color) ? $color : '#63f59a';
}

