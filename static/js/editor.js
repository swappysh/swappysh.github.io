(function () {
  'use strict';

  var apiBase = document.body.dataset.editorApi;
  var livePath = document.body.dataset.editorSource || '';
  var gateway = document.getElementById('editor-gateway');
  var gatewayMessage = document.getElementById('editor-gateway-message');
  var bar = document.getElementById('editor-bar');
  var pathLabel = document.getElementById('editor-path');
  var statusLabel = document.getElementById('editor-status');
  var pageDialog = document.getElementById('editor-page-dialog');
  var pagesDialog = document.getElementById('editor-pages-dialog');
  var newDialog = document.getElementById('editor-new-dialog');
  var contentRoot = document.querySelector('[data-editor-content], .post-content');
  if (contentRoot) contentRoot.setAttribute('data-editor-content', '');

  if (!apiBase || !gateway || !bar) return;

  var liveFile = null;
  var liveBlocks = [];
  var activeBlock = null;
  var dirty = false;
  var editorActive = false;
  var pageDialogFile = null;
  var liveEditingPaused = false;
  var linkSelection = null;
  var sessionToken = window.sessionStorage.getItem('site-editor-session') || '';

  var fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  if (fragment.has('editor_session')) {
    sessionToken = fragment.get('editor_session') || '';
    window.sessionStorage.setItem('site-editor-session', sessionToken);
    window.history.replaceState({}, '', window.location.pathname + window.location.search);
  }

  function isTextEntry(target) {
    return target instanceof Element && (target.matches('input, textarea, select') || target.isContentEditable);
  }

  function setStatus(message, state) {
    statusLabel.textContent = message;
    if (state) statusLabel.dataset.state = state;
    else statusLabel.removeAttribute('data-state');
  }

  function setDirty(next) {
    dirty = next;
    setStatus(next ? 'unsaved changes' : 'saved', next ? 'dirty' : '');
  }

  function publicPath(path) {
    var name = path.replace(/^content\//, '').replace(/\.md$/, '');
    if (name === '_index') return '/';
    name = name.replace(/\/(?:_?index)$/, '');
    return '/' + name.replace(/^\/+|\/+$/g, '') + '/';
  }

  function publicUrl(path) {
    return new URL(publicPath(path), window.location.origin).toString();
  }

  async function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return;
    }
    var field = document.createElement('textarea');
    field.value = value;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    var copied = document.execCommand('copy');
    field.remove();
    if (!copied) throw new Error('Could not copy the URL.');
  }

  async function copyUrl(url, targetStatus) {
    try {
      await copyText(url);
      if (targetStatus) targetStatus.textContent = 'URL copied';
      else setStatus('URL copied');
      return true;
    } catch (error) {
      if (targetStatus) targetStatus.textContent = error.message;
      else setStatus(error.message, 'error');
      return false;
    }
  }

  function copyUrlForPath(path, targetStatus) {
    return copyUrl(publicUrl(path), targetStatus);
  }

  async function request(path, options) {
    var init = options || {};
    init.headers = Object.assign({ Accept: 'application/json' }, init.headers || {});
    if (sessionToken) init.headers.Authorization = 'Session ' + sessionToken;
    if (init.body && !init.headers['Content-Type']) init.headers['Content-Type'] = 'application/json';

    var response = await fetch(apiBase + path, init);
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      var error = new Error(data.error || 'The editor request failed.');
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function showGateway(message) {
    gatewayMessage.textContent = message;
    gateway.hidden = false;
  }

  function hideGateway() {
    gateway.hidden = true;
  }

  function cleanReturnUrl() {
    var url = new URL(window.location.href);
    url.searchParams.delete('edit');
    url.searchParams.delete('edit_error');
    return url.toString();
  }

  async function enterEditor() {
    if (editorActive) return;
    showGateway('checking key…');

    try {
      var session = await request('/api/session');
      if (!session.authenticated) {
        showGateway('handing off to GitHub…');
        var returnUrl = new URL(cleanReturnUrl());
        returnUrl.searchParams.set('edit', '1');
        window.location.assign(apiBase + '/auth/start?return_to=' + encodeURIComponent(returnUrl.toString()));
        return;
      }

      showGateway('key accepted · loading ' + (livePath || 'backstage') + '…');
      editorActive = true;
      document.body.classList.add('editor-active');
      document.dispatchEvent(new CustomEvent('site-editor:active'));
      bar.hidden = false;
      pathLabel.textContent = livePath || 'content';

      if (livePath) {
        liveFile = await getFile(livePath);
        prepareLiveBlocks();
      } else {
        disableSave('this view has no content file');
      }

      hideGateway();
      var url = new URL(window.location.href);
      url.searchParams.delete('edit');
      url.searchParams.delete('edit_error');
      window.history.replaceState({}, '', url.toString());
    } catch (error) {
      gatewayMessage.textContent = error.status === 401
        ? 'public key denied'
        : 'the backstage door is not wired yet';
      window.setTimeout(hideGateway, 2400);
    }
  }

  function disableSave(reason) {
    var saveButton = bar.querySelector('[data-editor-action="save"]');
    saveButton.disabled = true;
    setStatus(reason);
  }

  function enableSave() {
    var saveButton = bar.querySelector('[data-editor-action="save"]');
    saveButton.disabled = false;
  }

  async function getFile(path) {
    return request('/api/file?path=' + encodeURIComponent(path));
  }

  function parseDocument(content) {
    var match = content.match(/^(\+\+\+|---)\r?\n/);
    if (!match) {
      return { format: 'none', frontMatter: '', body: content.replace(/^\s+/, '') };
    }

    var delimiter = match[1];
    var closing = new RegExp('\\r?\\n' + delimiter.replace(/\+/g, '\\+') + '\\r?\\n');
    var rest = content.slice(match[0].length);
    var closingMatch = closing.exec(rest);
    if (!closingMatch) return { format: 'none', frontMatter: '', body: content };

    var frontMatter = rest.slice(0, closingMatch.index);
    var body = rest.slice(closingMatch.index + closingMatch[0].length).replace(/^\r?\n/, '');
    return {
      format: delimiter === '+++' ? 'toml' : 'yaml',
      frontMatter: frontMatter,
      body: body
    };
  }

  function assembleDocument(doc, body) {
    var normalizedBody = body.replace(/\s+$/, '') + '\n';
    if (doc.format === 'none') return normalizedBody;
    var delimiter = doc.format === 'toml' ? '+++' : '---';
    return delimiter + '\n' + doc.frontMatter.replace(/\s+$/, '') + '\n' + delimiter + '\n\n' + normalizedBody;
  }

  function splitMarkdownBlocks(markdown) {
    var lines = markdown.replace(/\r\n/g, '\n').replace(/\s+$/, '').split('\n');
    var blocks = [];
    var index = 0;

    while (index < lines.length) {
      while (index < lines.length && !lines[index].trim()) index += 1;
      if (index >= lines.length) break;

      var start = index;
      var fence = lines[index].match(/^\s*(```+|~~~+)/);
      if (fence) {
        index += 1;
        while (index < lines.length && !lines[index].trim().startsWith(fence[1])) index += 1;
        if (index < lines.length) index += 1;
      } else if (/^\s*#{1,6}\s+/.test(lines[index]) || /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(lines[index])) {
        index += 1;
      } else if (/^\s*>\s?/.test(lines[index])) {
        while (index < lines.length && /^\s*>\s?/.test(lines[index])) index += 1;
      } else if (/^\s*(?:[-+*]|\d+[.)])\s+/.test(lines[index])) {
        index += 1;
        while (index < lines.length && lines[index].trim()) {
          if (/^\s*(?:[-+*]|\d+[.)])\s+/.test(lines[index]) || /^\s{2,}\S/.test(lines[index])) index += 1;
          else break;
        }
      } else {
        index += 1;
        while (index < lines.length && lines[index].trim()) {
          if (/^\s*(?:#{1,6}\s+|>|[-+*]\s+|\d+[.)]\s+|`{3,}|~{3,})/.test(lines[index])) break;
          index += 1;
        }
      }
      blocks.push(lines.slice(start, index).join('\n'));
    }
    return blocks;
  }

  function prepareLiveBlocks() {
    if (!contentRoot || !liveFile) {
      disableSave('use Page to edit this file');
      return;
    }

    var doc = parseDocument(liveFile.content);
    var blocks = splitMarkdownBlocks(doc.body);
    var elements = Array.prototype.slice.call(contentRoot.children);
    liveFile.document = doc;
    liveBlocks = blocks;

    contentRoot.querySelectorAll('[data-editor-block]').forEach(function (element) {
      element.removeAttribute('data-editor-block');
      element.removeAttribute('data-editor-block-label');
      element.removeAttribute('tabindex');
    });

    if (blocks.length !== elements.length) {
      disableSave('block map changed · use Page');
      return;
    }

    elements.forEach(function (element, index) {
      element.dataset.editorBlock = String(index);
      element.dataset.editorBlockLabel = blockLabel(element);
      element.tabIndex = 0;
    });

    if (!contentRoot.dataset.editorBound) {
      contentRoot.addEventListener('click', onBlockClick, true);
      contentRoot.addEventListener('keydown', onBlockKeydown);
      contentRoot.addEventListener('input', function () {
        if (activeBlock) setDirty(true);
      });
      contentRoot.dataset.editorBound = 'true';
    }

    liveEditingPaused = false;
    enableSave();
    setDirty(false);
  }

  function blockLabel(element) {
    var names = {
      P: 'paragraph', H1: 'heading', H2: 'heading', H3: 'heading', H4: 'heading',
      UL: 'list', OL: 'list', BLOCKQUOTE: 'quote', PRE: 'code', HR: 'divider'
    };
    return names[element.tagName] || 'block';
  }

  function onBlockClick(event) {
    if (!editorActive || liveEditingPaused) return;
    var block = event.target.closest('[data-editor-block]');
    if (!block || !contentRoot.contains(block)) return;
    event.preventDefault();
    event.stopPropagation();
    activateBlock(block, event.clientX, event.clientY);
  }

  function onBlockKeydown(event) {
    var block = event.target.closest('[data-editor-block]');
    if (!block) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      block.blur();
      return;
    }
    if (event.key === 'Enter' && block.tagName === 'P') {
      event.preventDefault();
      document.execCommand('insertLineBreak');
    }
  }

  function activateBlock(block, clientX, clientY) {
    if (activeBlock && activeBlock !== block) activeBlock.blur();
    if (block.isContentEditable) return;

    activeBlock = block;
    var originalHtml = block.innerHTML;
    block.contentEditable = 'true';
    block.classList.add('editor-block--active');
    block.focus({ preventScroll: true });
    placeCaret(block, clientX, clientY);

    block.addEventListener('blur', function finish() {
      block.removeEventListener('blur', finish);
      if (block.innerHTML !== originalHtml) {
        var index = Number(block.dataset.editorBlock);
        var nextMarkdown = elementToMarkdown(block);
        if (nextMarkdown !== liveBlocks[index]) {
          liveBlocks[index] = nextMarkdown;
          setDirty(true);
        }
      }
      block.contentEditable = 'false';
      block.classList.remove('editor-block--active');
      activeBlock = null;
    });
  }

  function captureLinkSelection() {
    var selection = window.getSelection();
    if (!activeBlock || !selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
    var range = selection.getRangeAt(0);
    if (!activeBlock.contains(range.commonAncestorContainer)) return null;
    return { block: activeBlock, range: range.cloneRange() };
  }

  document.addEventListener('selectionchange', function () {
    var selection = captureLinkSelection();
    if (selection) linkSelection = selection;
  });

  function applyInternalLink(path) {
    if (!linkSelection || !linkSelection.block.isConnected) return;
    var block = linkSelection.block;
    var range = linkSelection.range;
    var selection = window.getSelection();
    var href = publicPath(path);
    block.contentEditable = 'true';
    block.focus({ preventScroll: true });
    selection.removeAllRanges();
    selection.addRange(range);

    if (!document.execCommand('createLink', false, href)) {
      var anchor = document.createElement('a');
      anchor.setAttribute('href', href);
      anchor.appendChild(range.extractContents());
      range.insertNode(anchor);
    }

    block.contentEditable = 'false';
    block.classList.remove('editor-block--active');
    liveBlocks[Number(block.dataset.editorBlock)] = elementToMarkdown(block);
    activeBlock = null;
    linkSelection = null;
    setDirty(true);
    setStatus('linked to ' + href, 'dirty');
  }

  function placeCaret(block, x, y) {
    var selection = window.getSelection();
    if (!selection) return;
    var range = null;
    if (document.caretRangeFromPoint) range = document.caretRangeFromPoint(x, y);
    if (!range && document.caretPositionFromPoint) {
      var position = document.caretPositionFromPoint(x, y);
      if (position) {
        range = document.createRange();
        range.setStart(position.offsetNode, position.offset);
      }
    }
    if (range && block.contains(range.startContainer)) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  function inlineMarkdown(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    var element = node;
    var content = Array.prototype.map.call(element.childNodes, inlineMarkdown).join('');
    if (element.tagName === 'BR') return '\n';
    if (element.tagName === 'STRONG' || element.tagName === 'B') return '**' + content + '**';
    if (element.tagName === 'EM' || element.tagName === 'I') return '*' + content + '*';
    if (element.tagName === 'CODE') return '`' + content.replace(/`/g, '\\`') + '`';
    if (element.tagName === 'A') return '[' + content + '](' + (element.getAttribute('href') || '') + ')';
    if (element.tagName === 'SPAN' && element.classList.contains('vim-hl')) {
      return '<span class="vim-hl">' + escapeHtml(content) + '</span>';
    }
    if (element.tagName === 'DIV') return content + '\n';
    return content;
  }

  function listMarkdown(list, depth) {
    var ordered = list.tagName === 'OL';
    var lines = [];
    Array.prototype.forEach.call(list.children, function (item, index) {
      if (item.tagName !== 'LI') return;
      var nested = Array.prototype.filter.call(item.children, function (child) {
        return child.tagName === 'UL' || child.tagName === 'OL';
      });
      var mainNodes = Array.prototype.filter.call(item.childNodes, function (child) {
        return !(child.nodeType === Node.ELEMENT_NODE && (child.tagName === 'UL' || child.tagName === 'OL'));
      });
      var text = mainNodes.map(inlineMarkdown).join('').replace(/\s+/g, ' ').trim();
      var marker = ordered ? String(index + 1) + '.' : '-';
      lines.push('  '.repeat(depth) + marker + ' ' + text);
      nested.forEach(function (child) {
        lines.push(listMarkdown(child, depth + 1));
      });
    });
    return lines.join('\n');
  }

  function elementToMarkdown(element) {
    if (/^H[1-6]$/.test(element.tagName)) {
      return '#'.repeat(Number(element.tagName.slice(1))) + ' ' + inlineMarkdown(element).trim();
    }
    if (element.tagName === 'UL' || element.tagName === 'OL') return listMarkdown(element, 0);
    if (element.tagName === 'BLOCKQUOTE') {
      return inlineMarkdown(element).trim().split('\n').map(function (line) { return '> ' + line; }).join('\n');
    }
    if (element.tagName === 'PRE') {
      return '```\n' + element.textContent.replace(/\s+$/, '') + '\n```';
    }
    if (element.tagName === 'HR') return '---';
    return inlineMarkdown(element).replace(/\s+$/, '');
  }

  function escapeHtml(value) {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  async function putFile(file, content) {
    return request('/api/file', {
      method: 'PUT',
      body: JSON.stringify({ path: file.path, sha: file.sha || undefined, content: content })
    });
  }

  async function saveLivePage() {
    if (!liveFile || liveEditingPaused) return;
    if (activeBlock) activeBlock.blur();
    if (!dirty) {
      setStatus('nothing to save');
      return;
    }

    var saveButton = bar.querySelector('[data-editor-action="save"]');
    saveButton.disabled = true;
    setStatus('writing commit…');
    var content = assembleDocument(liveFile.document, liveBlocks.join('\n\n'));

    try {
      var result = await putFile(liveFile, content);
      liveFile.sha = result.sha;
      liveFile.content = content;
      setDirty(false);
    } catch (error) {
      setStatus(error.status === 409 ? 'page changed elsewhere · reopen it' : error.message, 'error');
    } finally {
      saveButton.disabled = false;
    }
  }

  function frontMatterValue(doc, key) {
    var expression = doc.format === 'toml'
      ? new RegExp('^' + key + '\\s*=\\s*(.+)$', 'm')
      : new RegExp('^' + key + '\\s*:\\s*(.+)$', 'm');
    var match = doc.frontMatter.match(expression);
    if (!match) return '';
    var value = match[1].trim();
    if ((value[0] === '"' && value[value.length - 1] === '"') ||
        (value[0] === "'" && value[value.length - 1] === "'")) {
      try {
        return value[0] === '"' ? JSON.parse(value) : value.slice(1, -1).replace(/''/g, "'");
      } catch (_) {
        return value.slice(1, -1);
      }
    }
    return value;
  }

  function frontMatterBoolean(doc, key) {
    return frontMatterValue(doc, key).toLowerCase() === 'true';
  }

  function setFrontMatterLine(frontMatter, format, key, value) {
    var separator = format === 'toml' ? '\\s*=' : '\\s*:';
    var expression = new RegExp('^' + key + separator + '.*(?:\\n|$)', 'm');
    var line = value === null ? '' : key + (format === 'toml' ? ' = ' : ': ') + value + '\n';
    if (expression.test(frontMatter)) return frontMatter.replace(expression, line).replace(/\n{3,}/g, '\n\n');
    if (value === null) return frontMatter;
    return frontMatter.replace(/\s+$/, '') + '\n' + line;
  }

  function quoted(value, format) {
    if (format === 'toml') return JSON.stringify(value);
    return JSON.stringify(value);
  }

  function documentFromPageForm(file) {
    var doc = file.document;
    var bodyValue = document.getElementById('editor-field-body').value;
    if (doc.format === 'none') return assembleDocument(doc, bodyValue);

    var title = document.getElementById('editor-field-title').value.trim();
    var description = document.getElementById('editor-field-description').value.trim();
    var draft = document.getElementById('editor-field-draft').checked;
    var frontMatter = doc.frontMatter;

    if (!title) throw new Error('A page title is required.');

    frontMatter = setFrontMatterLine(frontMatter, doc.format, 'title', quoted(title, doc.format));
    frontMatter = setFrontMatterLine(frontMatter, doc.format, 'description', description ? quoted(description, doc.format) : null);
    frontMatter = setFrontMatterLine(frontMatter, doc.format, 'draft', String(draft));
    return assembleDocument({ format: doc.format, frontMatter: frontMatter }, bodyValue);
  }

  async function openPage(path) {
    if (activeBlock) activeBlock.blur();
    if (path === livePath && dirty) {
      setStatus('save inline changes before opening Page', 'error');
      return;
    }
    var pageStatus = document.getElementById('editor-page-status');
    pageDialogFile = null;
    pageStatus.textContent = 'loading…';
    pageDialog.showModal();
    try {
      var file = await getFile(path);
      file.document = parseDocument(file.content);
      pageDialogFile = file;
      document.getElementById('editor-page-path').textContent = path;
      document.getElementById('editor-field-title').value = frontMatterValue(file.document, 'title');
      document.getElementById('editor-field-description').value = frontMatterValue(file.document, 'description');
      document.getElementById('editor-field-draft').checked = frontMatterBoolean(file.document, 'draft');
      document.getElementById('editor-field-body').value = file.document.body.replace(/\s+$/, '');
      document.getElementById('editor-page-meta').hidden = file.document.format === 'none';
      pageStatus.textContent = file.document.format === 'none' ? 'page metadata lives in site config' : '';
    } catch (error) {
      pageStatus.textContent = error.message;
    }
  }

  async function savePageDialog() {
    if (!pageDialogFile) return;
    var button = document.getElementById('editor-page-save');
    var pageStatus = document.getElementById('editor-page-status');
    button.disabled = true;
    pageStatus.textContent = 'writing commit…';

    try {
      var content = documentFromPageForm(pageDialogFile);
      var result = await putFile(pageDialogFile, content);
      pageDialogFile.sha = result.sha;
      pageDialogFile.content = content;
      pageDialogFile.document = parseDocument(content);
      pageStatus.textContent = 'saved';

      if (pageDialogFile.path === livePath) {
        liveFile = pageDialogFile;
        liveEditingPaused = true;
        dirty = false;
        disableSave('saved · refresh after deploy');
        contentRoot && contentRoot.querySelectorAll('[data-editor-block]').forEach(function (element) {
          element.removeAttribute('data-editor-block');
          element.removeAttribute('tabindex');
        });
      }
      window.setTimeout(function () { pageDialog.close(); }, 450);
    } catch (error) {
      pageStatus.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  }

  async function openPages(mode) {
    var list = document.getElementById('editor-pages-list');
    var choosingLink = mode === 'link';
    document.getElementById('editor-pages-title').textContent = choosingLink ? 'Choose link target' : 'All pages';
    list.textContent = 'loading…';
    pagesDialog.showModal();
    try {
      var result = await request('/api/files');
      list.replaceChildren();
      result.files.forEach(function (path) {
        var item = document.createElement('div');
        var openButton = document.createElement('button');
        var kind = document.createElement('span');
        var label = document.createElement('span');
        var copyButton = document.createElement('button');
        item.className = 'editor-pages__item';
        openButton.type = 'button';
        openButton.className = 'editor-pages__open';
        kind.className = 'editor-pages__kind';
        kind.textContent = path.startsWith('content/posts/') ? 'post' : 'page';
        label.className = 'editor-pages__path';
        label.textContent = path;
        openButton.append(kind, label);
        openButton.addEventListener('click', function () {
          if (choosingLink) {
            applyInternalLink(path);
            pagesDialog.close();
          } else {
            pagesDialog.close();
            openPage(path);
          }
        });
        copyButton.type = 'button';
        copyButton.className = 'editor-button editor-button--quiet editor-pages__copy';
        copyButton.textContent = 'Copy URL';
        copyButton.title = publicUrl(path);
        copyButton.addEventListener('click', async function () {
          if (await copyUrlForPath(path)) {
            copyButton.textContent = 'Copied';
            window.setTimeout(function () { copyButton.textContent = 'Copy URL'; }, 1200);
          }
        });
        item.append(openButton, copyButton);
        list.appendChild(item);
      });
    } catch (error) {
      list.textContent = error.message;
    }
  }

  function slugify(value) {
    return value.toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  function resetNewPage() {
    document.getElementById('editor-new-title-field').value = '';
    document.getElementById('editor-new-slug').value = '';
    delete document.getElementById('editor-new-slug').dataset.touched;
    document.getElementById('editor-new-kind').value = 'page';
    document.getElementById('editor-new-description').value = '';
    document.getElementById('editor-new-menu').checked = false;
    document.getElementById('editor-new-menu').closest('label').hidden = false;
    document.getElementById('editor-new-draft').checked = true;
    document.getElementById('editor-new-body').value = '';
    document.getElementById('editor-new-status').textContent = '';
  }

  function newPageContent() {
    var title = document.getElementById('editor-new-title-field').value.trim();
    var slug = slugify(document.getElementById('editor-new-slug').value);
    var kind = document.getElementById('editor-new-kind').value;
    var description = document.getElementById('editor-new-description').value.trim();
    var inMenu = document.getElementById('editor-new-menu').checked && kind === 'page';
    var draft = document.getElementById('editor-new-draft').checked;
    var bodyValue = document.getElementById('editor-new-body').value.replace(/\s+$/, '');
    if (!title || !slug) throw new Error('Title and URL slug are required.');

    var lines = [
      '+++',
      'title = ' + JSON.stringify(title),
      'date = ' + new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      'draft = ' + String(draft)
    ];
    if (description) lines.push('description = ' + JSON.stringify(description));
    if (inMenu) lines.push('menus = "main"');
    if (kind === 'post') {
      lines.push('tags = []');
      lines.push('categories = []');
    }
    lines.push('+++', '', bodyValue, '');
    return {
      path: kind === 'post' ? 'content/posts/' + slug + '.md' : 'content/' + slug + '.md',
      content: lines.join('\n')
    };
  }

  async function createPage() {
    var button = document.getElementById('editor-new-create');
    var newStatus = document.getElementById('editor-new-status');
    button.disabled = true;
    try {
      var page = newPageContent();
      newStatus.textContent = 'writing commit…';
      var result = await putFile({ path: page.path, sha: '' }, page.content);
      newStatus.textContent = 'created';
      window.setTimeout(function () {
        newDialog.close();
        openPage(page.path);
      }, 450);
      setStatus('created ' + page.path + ' · deploy started');
      return result;
    } catch (error) {
      newStatus.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  }

  function exitEditor() {
    if (activeBlock) activeBlock.blur();
    if (dirty && !window.confirm('Discard your unsaved changes?')) return;
    if (dirty) {
      window.location.reload();
      return;
    }
    editorActive = false;
    document.body.classList.remove('editor-active');
    document.dispatchEvent(new CustomEvent('site-editor:inactive'));
    bar.hidden = true;
    contentRoot && contentRoot.querySelectorAll('[contenteditable="true"]').forEach(function (element) {
      element.contentEditable = 'false';
    });
  }

  async function lockEditor() {
    if (activeBlock) activeBlock.blur();
    if (dirty && !window.confirm('Discard your unsaved changes and lock the editor?')) return;
    try {
      await request('/api/logout', { method: 'POST' });
    } finally {
      window.sessionStorage.removeItem('site-editor-session');
      sessionToken = '';
      document.dispatchEvent(new CustomEvent('site-editor:inactive'));
      window.location.reload();
    }
  }

  bar.addEventListener('click', function (event) {
    var button = event.target.closest('[data-editor-action]');
    if (!button) return;
    var action = button.dataset.editorAction;
    if (action === 'save') saveLivePage();
    if (action === 'link') {
      if (!linkSelection) {
        setStatus('select some text to link first', 'error');
        return;
      }
      openPages('link');
    }
    if (action === 'copy-link') {
      if (livePath) copyUrlForPath(livePath);
      else copyUrl(window.location.origin + window.location.pathname);
    }
    if (action === 'source' && livePath) openPage(livePath);
    if (action === 'pages') openPages();
    if (action === 'new') {
      resetNewPage();
      newDialog.showModal();
      document.getElementById('editor-new-title-field').focus();
    }
    if (action === 'exit') exitEditor();
    if (action === 'lock') lockEditor();
  });

  document.getElementById('editor-page-save').addEventListener('click', savePageDialog);
  document.getElementById('editor-page-copy').addEventListener('click', function () {
    if (pageDialogFile) copyUrlForPath(pageDialogFile.path, document.getElementById('editor-page-status'));
  });
  document.getElementById('editor-new-create').addEventListener('click', createPage);
  document.getElementById('editor-new-title-field').addEventListener('input', function (event) {
    var slug = document.getElementById('editor-new-slug');
    if (!slug.dataset.touched) slug.value = slugify(event.target.value);
  });
  document.getElementById('editor-new-slug').addEventListener('input', function (event) {
    event.target.dataset.touched = 'true';
    event.target.value = slugify(event.target.value);
  });
  document.getElementById('editor-new-kind').addEventListener('change', function (event) {
    document.getElementById('editor-new-menu').closest('label').hidden = event.target.value === 'post';
  });

  document.querySelectorAll('[data-dialog-close]').forEach(function (button) {
    button.addEventListener('click', function () {
      document.getElementById(button.dataset.dialogClose).close();
    });
  });

  [pageDialog, pagesDialog, newDialog].forEach(function (dialog) {
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) dialog.close();
    });
  });

  pagesDialog.addEventListener('close', function () {
    linkSelection = null;
  });

  window.addEventListener('beforeunload', function (event) {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });

  document.addEventListener('keydown', function (event) {
    if (!editorActive || isTextEntry(event.target)) return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      saveLivePage();
    }
  });

  var knock = '';
  var knockTimer;
  document.addEventListener('keydown', function (event) {
    if (editorActive || isTextEntry(event.target)) return;
    if (event.key.length !== 1) return;
    window.clearTimeout(knockTimer);
    var enteringCommand = knock.length > 0 || event.key === ':';
    if (enteringCommand) event.stopImmediatePropagation();
    knock = (knock + event.key.toLowerCase()).slice(-5);
    if (knock === ':edit') {
      knock = '';
      enterEditor();
      return;
    }
    knockTimer = window.setTimeout(function () { knock = ''; }, 1800);
  }, true);

  var logo = document.querySelector('.logo');
  if (logo) {
    var pressTimer;
    var longPressed = false;
    logo.addEventListener('pointerdown', function () {
      longPressed = false;
      pressTimer = window.setTimeout(function () {
        longPressed = true;
        enterEditor();
      }, 850);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (name) {
      logo.addEventListener(name, function () { window.clearTimeout(pressTimer); });
    });
    logo.addEventListener('click', function (event) {
      if (!longPressed) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      longPressed = false;
    }, true);
    logo.addEventListener('contextmenu', function (event) {
      if (longPressed) event.preventDefault();
    });
  }

  var currentUrl = new URL(window.location.href);
  if (currentUrl.searchParams.get('edit_error')) {
    showGateway('public key denied');
    window.setTimeout(hideGateway, 2400);
    window.history.replaceState({}, '', cleanReturnUrl());
  } else if (currentUrl.searchParams.get('edit') === '1') {
    enterEditor();
  }
})();
