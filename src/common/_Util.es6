import _Object from './_Object';

let caretIterator = null;

export default class _Util extends _Object {
  /**
   * @param {Node} rootNode
   * @param {Function} filter
   * @returns {NodeIterator}
   */
  static createTextNodeIterator(rootNode, filter = () => true) {
    return document.createNodeIterator(rootNode, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return filter(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      },
    }, true);
  }

  /**
   * @param {Number} x
   * @param {Number} y
   * @param {Node} rootNode
   * @param {String} unit (character or word)
   * @returns {TextRange|null}
   */
  static getCaretRange(x, y, rootNode, unit = 'word') {
    if (rootNode) {
      const isPointIn =
          rect => rect.left <= x && x <= rect.right && rect.top <= y && y <= rect.bottom;

      if (caretIterator) {
        caretIterator.previousNode();
      } else {
        caretIterator = this.createTextNodeIterator(rootNode, (textNode) => {
          if (/^\s*$/.test(textNode.nodeValue)) {
            return false;
          }
          const rects = textNode.parentElement.getAdjustedClientRects();
          for (let i = 0; i < rects.length; i++) {
            if (isPointIn(rects[i])) {
              return true;
            }
          }
          return false;
        });
      }

      let node;
      while ((node = caretIterator.nextNode())) {
        const range = document.createRange();
        range.selectNodeContents(node);

        const { length } = range.toString();
        for (let i = 0; i < length - 1; i++) {
          range.setStart(range.startContainer, i);
          range.setEnd(range.endContainer, i + 1);
          const rect = range.getAdjustedBoundingClientRect();
          if (isPointIn(rect)) {
            range.expand(unit);
            return range;
          }
        }
      }
      caretIterator = null;
      return null;
    }
    return document.caretRangeFromPoint(x, y);
  }

  /**
   * @returns {RegExp}
   */
  static getFootnoteRegex() {
    // 이 곳을 수정했다면 네이티브 코드도 수정해야 한다.
    return /^(\[|\{|\(|주|)[0-9].*(\)|\}|\]|\.|)$/gm;
  }

  /**
   * @returns {RegExp}
   */
  static getSplitWordRegex() {
    // 주의! NodeLocation의 wordIndex에 영향을 주는 부분으로 함부로 수정하지 말것.
    return new RegExp(' |\\u00A0');
  }

  /**
   * @param {Node} imgEl
   * @returns {{dWidth: *, dHeight: *, nWidth: number, nHeight: number,
   * sWidth: *, sHeight: *, aWidth: string, aHeight: string}}
   */
  static getImageSize(imgEl) {
    const attrs = imgEl.attributes;
    const zeroAttr = document.createAttribute('size');
    zeroAttr.value = '0px';

    return {
      // 화면에 맞춰 랜더링된 크기
      dWidth: imgEl.width,
      dHeight: imgEl.height,
      // 원본 크기
      nWidth: imgEl.naturalWidth,
      nHeight: imgEl.naturalHeight,
      // CSS에서 명시된 크기
      sWidth: _Util.getMatchedCSSValue(imgEl, 'width'),
      sHeight: _Util.getMatchedCSSValue(imgEl, 'height'),
      // 엘리먼트 속성으로 명시된 크기
      aWidth: (attrs.width || zeroAttr).value,
      aHeight: (attrs.height || zeroAttr).value,
    };
  }

  /**
   * @param {Node} target
   * @param {String} property
   * @returns {Number}
   */
  static getStylePropertyIntValue(target, property) {
    let style = target;
    if (target.nodeType) {
      style = window.getComputedStyle(target);
    }
    return parseInt(style[property], 10) || 0;
  }

  /**
   * @param {Node} target
   * @param {String[]} properties
   * @returns {Number}
   */
  static getStylePropertiesIntValue(target, properties) {
    let style = target;
    if (target.nodeType) {
      style = window.getComputedStyle(target);
    }
    let value = 0;
    for (let i = 0; i < properties.length; i += 1) {
      value += (parseInt(style[properties[i]], 10) || 0);
    }
    return value;
  }

  /**
   * @param {Node} el
   * @param {String} property
   * @returns {String}
   * @private
   */
  static _getMatchedCSSValue(el, property) {
    // element property has highest priority
    let val = el.style.getPropertyValue(property);

    // if it's important, we are done
    if (el.style.getPropertyPriority(property)) {
      return val;
    }

    // get matched rules
    const rules = window.getMatchedCSSRules(el);
    if (rules === null) {
      return val;
    }

    // iterate the rules backwards
    // rules are ordered by priority, highest last
    for (let i = rules.length - 1; i >= 0; i -= 1) {
      const rule = rules[i];
      const important = rule.style.getPropertyPriority(property);

      // if set, only reset if important
      if (val === null || val.length === 0 || important) {
        val = rule.style.getPropertyValue(property);

        // done if important
        if (important) {
          break;
        }
      }
    }

    return val;
  }

  /**
   * @param {Node} el
   * @param {String} property
   * @param {Boolean} recursive
   * @returns {String|null}
   */
  static getMatchedCSSValue(el, property, recursive = false) {
    let val;
    let target = el;
    while (!(val = this._getMatchedCSSValue(target, property))) {
      target = target.parentElement;
      if (target === null || !recursive) {
        break;
      }
    }

    return val;
  }

  /**
   * @param {Array|MutableClientRectList} array1
   * @param {Array|MutableClientRectList} array2
   * @param {function} adjust
   * @returns {Array|MutableClientRectList}
   */
  static concatArray(array1, array2, adjust = rect => rect) {
    for (let i = 0; i < array2.length; i += 1) {
      array1.push(adjust(array2[i]));
    }
    return array1;
  }
}
