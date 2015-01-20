'use strict';

var tagNameCounter = 1;

export default {
  /**
   * Generate a tag name that is safe to register (e.g., won't cause a
   * duplicate tag name registration).
   *
   * @param id the identifier for the tag
   * @returns {safe: string, unsafe: string} an object the unsafe tag name
   *   (value of id) and safe tag name.
   */
  safeTagName: function (id) {
    var safeId = id + '-' + (tagNameCounter++).toString();
    return {unsafe: id, safe: safeId};
  },

  add: function (name, tagName) {
    var safeTagName = typeof tagName === 'undefined' ? name : tagName.safe;
    return this.fixture('<' + safeTagName + '></' + safeTagName + '>').querySelector(safeTagName);
  },

  remove: function (element) {
    element.parentNode.removeChild(element);
    return element;
  },

  fixture: function (html, tagName) {
    var fixture = document.getElementById('fixture');
    if (!fixture) {
      fixture = document.createElement('div');
      fixture.id = 'fixture';
      document.body.appendChild(fixture);
    }

    if (arguments.length) {
      fixture.innerHTML = '';

      if (typeof html === 'string') {
        if (typeof tagName !== 'undefined') {
          var openTagRegex = new RegExp('<' + tagName.unsafe + '\\b', 'g');
          var closeTagRegex = new RegExp('</' + tagName.unsafe + '>', 'g');

          html = html
            .replace(openTagRegex, '<' + tagName.safe)
            .replace(closeTagRegex, '</' + tagName.safe + '>');
        }

        fixture.innerHTML = html;
      } else if (typeof html === 'object') {
        fixture.appendChild(html);
      }
    }

    return fixture;
  },

  afterMutations: function (callback) {
    setTimeout(callback, 1);
  },

  dispatchEvent: function (name, element) {
    var e = document.createEvent('CustomEvent');
    e.initCustomEvent(name, true, true, {});
    element.dispatchEvent(e);
  }
};
