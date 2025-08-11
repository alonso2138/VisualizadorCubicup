// DOMHelpers - DOM manipulation utilities
// Part of the ExperienceManager modular system

export class DOMHelpers {
    static getElementById(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with id '${id}' not found`);
        }
        return element;
    }

    static querySelector(selector) {
        const element = document.querySelector(selector);
        if (!element) {
            console.warn(`Element with selector '${selector}' not found`);
        }
        return element;
    }

    static querySelectorAll(selector) {
        return document.querySelectorAll(selector);
    }

    static createElement(tag, attributes = {}, textContent = '') {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else {
                element.setAttribute(key, value);
            }
        });
        
        if (textContent) {
            element.textContent = textContent;
        }
        
        return element;
    }

    static show(element) {
        if (element) {
            element.style.display = 'block';
        }
    }

    static hide(element) {
        if (element) {
            element.style.display = 'none';
        }
    }

    static toggle(element) {
        if (element) {
            element.style.display = element.style.display === 'none' ? 'block' : 'none';
        }
    }

    static addClass(element, className) {
        if (element) {
            element.classList.add(className);
        }
    }

    static removeClass(element, className) {
        if (element) {
            element.classList.remove(className);
        }
    }

    static toggleClass(element, className) {
        if (element) {
            element.classList.toggle(className);
        }
    }

    static setAttributes(element, attributes) {
        if (element) {
            Object.entries(attributes).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });
        }
    }

    static removeAttributes(element, ...attributes) {
        if (element) {
            attributes.forEach(attr => {
                element.removeAttribute(attr);
            });
        }
    }

    static empty(element) {
        if (element) {
            element.innerHTML = '';
        }
    }

    static appendTo(parent, child) {
        if (parent && child) {
            parent.appendChild(child);
        }
    }

    static prependTo(parent, child) {
        if (parent && child) {
            parent.insertBefore(child, parent.firstChild);
        }
    }

    static insertAfter(newElement, existingElement) {
        if (newElement && existingElement && existingElement.parentNode) {
            existingElement.parentNode.insertBefore(newElement, existingElement.nextSibling);
        }
    }

    static remove(element) {
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
    }

    static getElementDimensions(element) {
        if (!element) return { width: 0, height: 0 };
        
        return {
            width: element.clientWidth,
            height: element.clientHeight,
            offsetWidth: element.offsetWidth,
            offsetHeight: element.offsetHeight,
            scrollWidth: element.scrollWidth,
            scrollHeight: element.scrollHeight
        };
    }

    static waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver((mutations, obs) => {
                const element = document.querySelector(selector);
                if (element) {
                    obs.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }, timeout);
        });
    }

    static onReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            callback();
        }
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}
