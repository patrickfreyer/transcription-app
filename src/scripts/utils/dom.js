/**
 * DOM Manipulation Utilities
 */

/**
 * Create an element with attributes and children
 * @param {string} tag - HTML tag name
 * @param {object} attrs - Attributes and properties
 * @param {Array|string} children - Child elements or text
 * @returns {HTMLElement}
 */
export function createElement(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);

  // Set attributes and properties
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'innerHTML') {
      element.innerHTML = value;
    } else if (key.startsWith('on') && typeof value === 'function') {
      element.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key.startsWith('data-')) {
      element.setAttribute(key, value);
    } else {
      element[key] = value;
    }
  });

  // Add children
  const childArray = Array.isArray(children) ? children : [children];
  childArray.forEach(child => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  });

  return element;
}

/**
 * Query selector with type safety
 */
export function $(selector, context = document) {
  return context.querySelector(selector);
}

/**
 * Query selector all with array return
 */
export function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

/**
 * Add event listener with cleanup
 */
export function on(element, event, handler, options) {
  element.addEventListener(event, handler, options);
  return () => element.removeEventListener(event, handler, options);
}

/**
 * Remove all children from element
 */
export function clearChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Toggle class on element
 */
export function toggleClass(element, className, force) {
  return element.classList.toggle(className, force);
}

/**
 * Show/hide element
 */
export function show(element, display = 'block') {
  element.style.display = display;
}

export function hide(element) {
  element.style.display = 'none';
}

/**
 * Check if element is visible
 */
export function isVisible(element) {
  return element.offsetParent !== null;
}

/**
 * Smooth scroll to element
 */
export function scrollToElement(element, options = {}) {
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
    ...options,
  });
}

/**
 * Wait for DOM content loaded
 */
export function ready(callback) {
  if (document.readyState !== 'loading') {
    callback();
  } else {
    document.addEventListener('DOMContentLoaded', callback);
  }
}

/**
 * Create and dispatch custom event
 */
export function dispatch(element, eventName, detail = {}) {
  const event = new CustomEvent(eventName, {
    bubbles: true,
    cancelable: true,
    detail,
  });
  return element.dispatchEvent(event);
}

/**
 * Get computed style value
 */
export function getStyle(element, property) {
  return window.getComputedStyle(element).getPropertyValue(property);
}

/**
 * Set multiple styles at once
 */
export function setStyles(element, styles) {
  Object.entries(styles).forEach(([property, value]) => {
    element.style[property] = value;
  });
}
