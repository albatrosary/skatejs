import assign from 'object-assign';
import dashCase from '../util/dash-case';
import data from '../util/data';
import empty from '../util/empty';

// TODO Split apart createNativePropertyDefinition function.

function getData (elem, name) {
  return data(elem, `api/property/${name}`);
}

function getLinkedAttribute (name, attr) {
  return attr === true ? dashCase(name) : attr;
}

function createNativePropertyDefinition (name, opts) {
  let prop = {
    configurable: true,
    enumerable: true
  };

  prop.created = function (elem, initialValue) {
    let info = getData(elem, name);
    info.linkedAttribute = getLinkedAttribute(name, opts.attribute);
    info.removeAttribute = elem.removeAttribute;
    info.setAttribute = elem.setAttribute;
    info.updatingProperty = false;

    if (typeof opts.default === 'function') {
      info.defaultValue = opts.default(elem);
    } else if (!empty(opts.default)) {
      info.defaultValue = opts.default;
    }
    
    const defaultValue = info.defaultValue;
    const defaultValueIsEmpty = empty(defaultValue);

    // TODO Refactor to be cleaner.
    if (info.linkedAttribute) {
      if (!info.attributeMap) {
        info.attributeMap = {};

        elem.removeAttribute = function (attrName) {
          info.updatingAttribute = true;

          if (defaultValueIsEmpty) {
            info.removeAttribute.call(this, attrName);
          } else {
            info.setAttribute.call(this, attrName, defaultValue);
          }

          if (attrName in info.attributeMap) {
            const propertyName = info.attributeMap[attrName];
            elem[propertyName] = defaultValueIsEmpty ? undefined : defaultValue;
          }

          info.updatingAttribute = false;
        };

        elem.setAttribute = function (attrName, attrValue) {
          info.updatingAttribute = true;
          info.setAttribute.call(this, attrName, attrValue);

          if (attrName in info.attributeMap) {
            const propertyName = info.attributeMap[attrName];
            attrValue = String(attrValue);
            elem[propertyName] = opts.deserialize(attrValue);
          }

          info.updatingAttribute = false;
        };
      }

      info.attributeMap[info.linkedAttribute] = name;
    }

    if (empty(initialValue)) {
      if (info.linkedAttribute && elem.hasAttribute(info.linkedAttribute)) {
        let attributeValue = elem.getAttribute(info.linkedAttribute);
        initialValue = opts.deserialize(attributeValue);
      } else {
        initialValue = info.defaultValue;
      }
    }

    info.internalValue = initialValue;

    if (typeof opts.created === 'function') {
      opts.created(elem, initialValue);
    }
  };

  prop.get = function () {
    const info = getData(this, name);
    const internalValue = info.internalValue;

    if (opts.get) {
      return opts.get(this, { name, internalValue });
    }

    return internalValue;
  };
  
  prop.init = function () {
    const init = getData(this, name).internalValue;
    this[name] = empty(init) ? this[name] : init;
  };

  prop.set = function (newValue) {
    const info = getData(this, name);
    let oldValue;

    if (info.updatingProperty) {
      return;
    }

    info.updatingProperty = true;

    if (typeof opts.coerce === 'function') {
      newValue = opts.coerce(newValue);
    }

    info.internalValue = empty(newValue) ? info.defaultValue : newValue;

    if (info.linkedAttribute && !info.updatingAttribute) {
      let serializedValue = opts.serialize(newValue);
      if (empty(serializedValue)) {
        info.removeAttribute.call(this, info.linkedAttribute);
      } else {
        info.setAttribute.call(this, info.linkedAttribute, serializedValue);
      }
    }

    let changeData = {
      name: name,
      newValue: newValue,
      oldValue: oldValue
    };

    if (typeof opts.set === 'function') {
      opts.set(this, changeData);
    }

    info.updatingProperty = false;
  };

  return prop;
}

export default function (opts) {
  opts = opts || {};

  if (typeof opts === 'function') {
    opts = { coerce: opts };
  }

  return function (name) {
    return createNativePropertyDefinition(name, assign({
      deserialize: value => value,
      serialize: value => value
    }, opts));
  };
}
