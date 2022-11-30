export default function cssUpdatePreprocessor(): {
    markup: ({ content, filename }: {
        content: string;
        filename: string;
    }) => {
        code: string;
    };
    script: ({ content, filename }: {
        content: any;
        filename: any;
    }) => {
        code: string;
    };
    style: ({ content, filename }: {
        content: any;
        filename: any;
    }) => {
        code: any;
    };
};
