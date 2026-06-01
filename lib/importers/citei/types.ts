/** Formato nativo do citei-api (MongoDB / API). */
export interface CiteiQuoteRaw {
  _id?: string | { $oid?: string };
  author?: string;
  authorslug?: string;
  category?: string;
  categoryslug?: string;
  text?: string;
}

export interface CiteiDatasetScan {
  repoPath: string;
  authorsFile?: string;
  categoriesFile?: string;
  quoteFiles: string[];
  authorsCount: number;
  categoriesCount: number;
}
