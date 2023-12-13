class WebResponder {
    constructor() {
        this.elements = [];
    }

    say(message, attributes = {}) {
        attributes = Object.assign({ action: '/' }, attributes);
        const sayElement = new Say(message, attributes);
        this.elements.push(sayElement);
        return sayElement;
    }

    gather(attributes = {}) {
        attributes = Object.assign({ action: '/', method: 'GET' }, attributes);
        const gatherElement = new Gather(attributes);
        this.elements.push(gatherElement);
        return gatherElement;
    }

    toString() {
        if (this.elements.length === 1) {
            return this.elements[0].toString();
        }

        let elementsString = '';
        for (const element of this.elements) {
            elementsString += element.toString();
        }
        return `<Response>${elementsString}</Response>`;
    }
}

class Say {
    constructor(message, attributes = {}) {
        this.message = message;
        this.attributes = attributes;
    }

    toString() {
        let attributesString = '';
        for (let key in this.attributes) {
            attributesString += ` ${key}="${this.attributes[key]}"`;
        }
        return `<Say${attributesString}>${this.message}</Say>`;
    }
}

class Gather {
    constructor(attributes = {}) {
        this.attributes = attributes;
        this.elements = [];
    }

    say(message, attributes = {}) {
        attributes = Object.assign({ action: '/' }, attributes);
        const sayElement = new Say(message, attributes);
        this.elements.push(sayElement);
        return sayElement;
    }

    toString() {
        let attributesString = '';
        for (let key in this.attributes) {
            attributesString += ` ${key}="${this.attributes[key]}"`;
        }
        let elementsString = '';
        for (const element of this.elements) {
            elementsString += element.toString();
        }
        return `<Gather${attributesString}>${elementsString}</Gather>`;
    }
}

module.exports = WebResponder;
