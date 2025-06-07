import {
  type ZodSchema,
  validateData,
  convertServerErrorToRequestError,
} from "./errorHelpers";

interface IRequestOptions {
  successMessage?: string;
  errorMessage?: string;
  schema?: ZodSchema;
  field?: string;
  headers?: any;
  transformRequest?: (data: any) => any;
  renameServerValidationErrors?: { [key: string]: string };
  isAuth?: boolean;
}

const request = async <T>(
  method: string,
  url: string,
  body?: any,
  options?: IRequestOptions
) => {
  if (options?.schema) {
    const clientValidation = validateData(options.schema, body, options?.field);
    if (!clientValidation.success) {
      return clientValidation;
    }
    if (options.field) {
      return null;
    }
  }

  if (options?.transformRequest) {
    body = options.transformRequest(body);
  }

  const headers = {
    Accept: "application/json",
    "Accept-Encoding": "br",
    "Content-Type": "application/json",
    ...(options?.headers || {}),
  };

  let fetchOptions = {
    method: method,
    headers: headers,
  };

  if (!["GET", "DELETE"].includes(method)) {
    fetchOptions.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    if (!response.ok) {
      const serverError = data;
      const requestError = convertServerErrorToRequestError(
        serverError,
        options?.renameServerValidationErrors || {}
      );

      return { success: false, error: requestError };
    }

    return { success: true, value: data };
  } catch (err) {
    return { success: false, error: { message: "Network error" } };
  }
};

export default {
  get: <T>(url: string, options?: IRequestOptions) => {
    return request<T>("GET", url, {}, options);
  },
  post: <T>(url: string, body: any, options?: IRequestOptions) => {
    return request<T>("POST", url, body, options);
  },
  patch: <T>(url: string, body: any, options?: IRequestOptions) => {
    return request<T>("PATCH", url, body, options);
  },
  put: <T>(url: string, body: any, options?: IRequestOptions) => {
    return request<T>("PUT", url, body, options);
  },
  delete: <T>(url: string, options?: IRequestOptions) => {
    return request<T>("DELETE", url, undefined, options);
  },
};
