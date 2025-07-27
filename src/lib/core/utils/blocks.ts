// Block utilities (extracted from index.ts)
import { STORAGE_URL } from '../config';

export interface Block {
    id: string;
    key: string;
    type: string;
    properties: any;
    value: any;
}

export interface Collection {
    id: string;
    blocks: Block[];
}

export interface CollectionEntry {
    id: string;
    collection_id: string;
    blocks: Block[];
}

export const typeIcons = {
    text: "mdi:text",
    number: "mdi:numeric",
    html: "mdi:code-tags",
    select: "mdi:select",
    range: "mdi:arrow-left-right",
    date: "mdi:calendar",
    boolean: "mdi:checkbox-marked-outline",
    geo_location: "mdi:map-marker",
    block: "mdi:asterisk",
    media: "mdi:upload",
};

export const blockTypes = {
    text: {
        label: "Text",
        properties: {
            isRequired: false,
            placeholder: "",
            helpText: "",
        },
    },
    number: {
        label: "Number",
        properties: {
            isRequired: false,
            min: null,
            max: null,
            helpText: "",
        },
    },
    select: {
        label: "Select",
        properties: {
            isRequired: false,
            options: [],
            isMultiSelect: false,
            helpText: "",
        },
    },
    date: {
        label: "Date",
        properties: {
            isRequired: false,
            helpText: "",
        },
    },
    boolean: {
        label: "Boolean",
        properties: {
            checkboxLabel: "",
            helpText: "",
        },
    },
    html: {
        label: "Rich Text",
        properties: {
            isRequired: false,
            helpText: "",
        },
    },
    media: {
        label: "Media Upload",
        properties: {
            isRequired: false,
            acceptedTypes: "image/*",
            helpText: "",
        },
    },
};

export function getBlockLabel(block: any, locale: string = 'en'): string {
    if (!block) return "";

    if (block.properties?.label) {
        if (typeof block.properties.label === "object") {
            return (
                block.properties.label[locale] ||
                block.properties.label.en ||
                Object.values(block.properties.label)[0] ||
                ""
            );
        }
        if (typeof block.properties.label === "string") {
            return block.properties.label;
        }
    }
    
    // Convert key to readable format
    return block.key?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || "";
}

export function createBlock(type: string, key: string, label?: string): any {
    if (!blockTypes[type as keyof typeof blockTypes]) {
        throw new Error(`Unknown block type: ${type}`);
    }

    return {
        key,
        type,
        properties: {
            ...blockTypes[type as keyof typeof blockTypes].properties,
            label: label || key,
        },
        value: null,
    };
}

export function formatBlockValue(block: any): string {
    if (!block || block.value === null || block.value === undefined) {
        return "";
    }

    switch (block.type) {
        case "boolean":
            return block.value ? "Yes" : "No";
        case "date":
            try {
                return new Date(block.value).toLocaleDateString();
            } catch (e) {
                return String(block.value);
            }
        case "media":
            if (typeof block.value === "object" && block.value.url) {
                return block.value.url;
            }
            return String(block.value);
        default:
            return String(block.value);
    }
}

export function prepareBlocksForSubmission(formData: any): any[] {
    const preparedBlocks = [];

    Object.keys(formData).forEach((key) => {
        if (formData[key] !== null && formData[key] !== undefined) {
            preparedBlocks.push({
                key,
                value: [formData[key]],
            });
        }
    });

    return preparedBlocks;
}

export function extractBlockValues(blocks: any[]): Record<string, any> {
    const values: Record<string, any> = {};

    blocks.forEach((block) => {
        if (block.value && block.value.length > 0) {
            values[block.key] = block.value[0];
        } else {
            values[block.key] = null;
        }
    });

    return values;
}

// Extract localized text value from a block, handling multilingual content
export function getBlockTextValue(block: any, locale: string = 'en'): string {
    if (!block || !block.value || block.value.length === 0) return '';
    
    const firstValue = block.value[0];
    
    // Handle multilingual object
    if (typeof firstValue === 'object' && firstValue !== null) {
        // Try specified locale first, then 'en', then first available language
        if (firstValue[locale]) return firstValue[locale];
        if (firstValue.en) return firstValue.en;
        const values = Object.values(firstValue);
        return String(values[0] || '');
    }
    
    // Handle simple string
    return String(firstValue);
}

// Legacy functions for backward compatibility
export const getBlockValue = (entry: any, blockKey: string) => {
    if (!entry || !entry.blocks) return null;

    const block = entry.blocks.find((f: any) => f.key === blockKey);

    if (!block || !block.value || block.value.length === 0) return null;

    return block.value[0];
};

export const getBlockValues = (entry: any, blockKey: string) => {
    if (!entry || !entry.blocks) return null;

    const block = entry.blocks.find((f: any) => f.key === blockKey);

    if (!block || !block.value || block.value.length === 0) return null;

    return block.value;
};

function unwrapBlock(block: any, locale: string) {
    if (!block?.type || block.value === undefined) return block;

    // Nested objects / lists → recurse for every child
    if (block.type === "block") {
        return block.value.map((obj: Record<string, any>) => {
            const parsed: Record<string, any> = {};
            for (const [k, v] of Object.entries(obj)) {
                parsed[k] = unwrapBlock(v, locale);
            }
            return parsed;
        });
    }

    // Primitive leaves (text/number/boolean/media …)
    const isLocalized = block.type === "text";
    const isList =
        block.properties?.ui === "list" ||
        (block.properties?.maxValues ?? 1) > 1 ||
        block.value.length > 1;

    if (isList) {
        return isLocalized
            ? block.value.map((v: Record<string, any>) => v[locale] || v["en"])
            : [...block.value];
    }

    return isLocalized ? block.value[0][locale] || block.value[0]["en"] : block.value[0];
}

export const getBlockObjectValues = (entry: any, blockKey: string, locale = "en") => {
    if (!entry) {
        return [];
    }

    const values = getBlockValues(entry, blockKey); // top‑level list

    const parsed = values.map((obj: Record<string, any>) => {
        const res = obj.value.reduce((acc: any, current: any) => {
            acc[current.key] = unwrapBlock(current, locale);

            return acc;
        }, {});

        return res;
    });

    return parsed;
};

export const getBlockFromArray = (entry: any, blockKey: string, locale = "en") => {
    if (!entry) {
        return [];
    }

    const values = getBlockValues(entry, blockKey); // top‑level list

    return values.reduce((acc: any, current: any) => {
        acc[current.key] = unwrapBlock(current, locale);
        return acc;
    });
};

export const getImageUrl = (imageBlock: any, isBlock = true) => {
    if (!imageBlock) return null;

    const storageUrl = STORAGE_URL || "";

    // Helper to check if URL is external
    const isExternalUrl = (url: string) => {
        return url.startsWith('http://') || url.startsWith('https://');
    };

    if (isBlock) {
        if (typeof imageBlock === "string") {
            // Check if it's already a full URL
            if (isExternalUrl(imageBlock)) {
                return imageBlock;
            }
            return `${storageUrl}/${imageBlock}`;
        }

        if (imageBlock.url) {
            // Check if it's already a full URL
            if (isExternalUrl(imageBlock.url)) {
                return imageBlock.url;
            }
            return `${storageUrl}/${imageBlock.url}`;
        }
    }

    if (
        imageBlock.resolutions &&
        imageBlock.resolutions.original &&
        imageBlock.resolutions.original.url
    ) {
        const url = imageBlock.resolutions.original.url;
        // Check if it's already a full URL
        if (isExternalUrl(url)) {
            return url;
        }
        return `${storageUrl}/${url}`;
    }

    return null;
};

export function getGalleryThumbnail(gallery: any) {
    if (!gallery?.length) return null;
    const item = gallery.find((g: any) => g.settings.isThumbnail) || gallery[0];
    const res = item.media.resolutions.thumbnail || item.media.resolutions.original;
    return res?.url || null;
}

// full URL or null
export function thumbnailUrl(service: any) {
    const storageUrl = STORAGE_URL || "";
    const path = getGalleryThumbnail(service.gallery);
    return path ? `${storageUrl}/${path}` : null;
}

export const translateMap = (labels: any, lang: string, fallback = "unknown") => {
    let parsedLang = "en";

    if (lang === "sr") {
        parsedLang = "bih";
    }

    if (!labels) {
        return fallback;
    }

    const label = labels[parsedLang];
    if (!label) {
        return fallback;
    }

    return label;
};