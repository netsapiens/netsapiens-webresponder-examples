<?php

class WebResponder {
    private $elements = [];

    public function gather($attributes) {
        $gather = new Gather($attributes);
        $this->elements[] = $gather;
        return $gather;
    }

    public function say($message) {
        $this->elements[] = new Say($message);
    }

    public function record($attributes = []) {
        $this->elements[] = new Record($attributes);
    }

    public function play($url) {
        $this->elements[] = new Play($url);
    }

    public function forward($number) {
        $this->elements[] = new Forward($number);
    }

    public function asXML(): string {
        $xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
    
        $elementsXML = '';
        foreach ($this->elements as $element) {
            $elementsXML .= $element->asXML();
        }
    
        return count($this->elements) > 1 ? $xmlHeader . '<Response>' . $elementsXML . '</Response>' : $xmlHeader . $elementsXML;
    }
}

class Gather {
    private $attributes;
    private $content = [];

    public function __construct($attributes) {
        $this->attributes = $attributes;
    }

    public function say($message) {
        $this->content[] = new Say($message);
    }

    public function asXML() {
        $xml = '<Gather';
        foreach ($this->attributes as $key => $value) {
            $xml .= " $key=\"$value\"";
        }
        $xml .= '>';
        foreach ($this->content as $element) {
            $xml .= $element->asXML();
        }
        $xml .= '</Gather>';
        return $xml;
    }
}

class Say {
    private $message;

    public function __construct($message) {
        $this->message = $message;
    }

    public function asXML() {
        return "<Say>$this->message</Say>";
    }
}

class Record {
    private $attributes;

    public function __construct($attributes = []) {
        $this->attributes = $attributes;
    }

    public function asXML() {
        $xml = '<Record';
        foreach ($this->attributes as $key => $value) {
            $xml .= " $key=\"$value\"";
        }
        $xml .= '/>';
        return $xml;
    }
}

class Play {
    private $url;

    public function __construct($url) {
        $this->url = $url;
    }

    public function asXML() {
        return "<Play>$this->url</Play>";
    }
}

class Forward {
    private $number;

    public function __construct($number) {
        $this->number = $number;
    }

    public function asXML() {
        return "<Forward>$this->number</Forward>";
    }
}
