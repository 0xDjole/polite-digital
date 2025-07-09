import { API_URL, BUSINESS_ID } from '../config';
import httpClient from '../services/http';
import { ApiResponse } from '../types';

const getCollection = async (id: string) => {
    const url = `${API_URL}/v1/businesses/${BUSINESS_ID}/collections/${id}`;
    const { value } = await httpClient.get(url);
    return value;
};

const getCollections = async ({ name = null, ids = null }: { name?: string | null; ids?: string[] | null }) => {
    let url = `${API_URL}/v1/businesses/${BUSINESS_ID}/collections`;

    const queryParams = [];

    if (name) {
        queryParams.push(`name=${encodeURIComponent(name)}`);
    }

    if (ids) {
        const idsJson = JSON.stringify(ids);
        queryParams.push(`ids=${encodeURIComponent(idsJson)}`);
    }

    if (queryParams.length > 0) {
        url += `?${queryParams.join("&")}`;
    }

    const response = await httpClient.get(url);
    return response.value;
};

const getCollectionEntries = async ({ 
    collectionId, 
    limit, 
    cursor, 
    ids = null 
}: { 
    collectionId: string; 
    limit?: number; 
    cursor?: string; 
    ids?: string[] | null;
}) => {
    let url = `${API_URL}/v1/businesses/${BUSINESS_ID}/collections/${collectionId}/entries`;

    const queryParams = [];

    if (limit) {
        queryParams.push(`limit=${limit}`);
    }

    if (cursor) {
        queryParams.push(`cursor=${cursor}`);
    }

    if (ids) {
        const idsJson = JSON.stringify(ids);
        queryParams.push(`ids=${encodeURIComponent(idsJson)}`);
    }

    if (queryParams.length > 0) {
        url += `?${queryParams.join("&")}`;
    }

    const response = await httpClient.get(url);
    return response.value;
};

const createCollectionEntry = async (collectionEntryData: any) => {
    const url = `${API_URL}/v1/businesses/${BUSINESS_ID}/collections/${collectionEntryData.collectionId}/entries`;

    const result = await httpClient.post(url, collectionEntryData, {
        successMessage: "Created successfully",
        errorMessage: "Failed to create collection",
    });

    return result;
};

const getCollectionEntry = async ({ collectionId, id }: { collectionId: string; id: string }) => {
    const url = `${API_URL}/v1/businesses/${BUSINESS_ID}/collections/${collectionId}/entries/${id}`;

    const response = await httpClient.get(url);

    return response;
};

export const cmsApi = {
    getCollection,
    getCollections,
    getCollectionEntries,
    getCollectionEntry,
    createCollectionEntry,
};