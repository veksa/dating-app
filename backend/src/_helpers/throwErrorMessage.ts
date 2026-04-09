interface IThrowErrorParams {
    errorCode: string;
    description?: string;
}

export const throwErrorMessage = (params: IThrowErrorParams) => {
    throw new Error(JSON.stringify(params));
};
