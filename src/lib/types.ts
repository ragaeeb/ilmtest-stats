export type Row = Record<string, string | number | null | Date>;

export type ColumnInfo = {
  key: string;
  type: "string" | "number" | "date";
  uniqueCount: number;
};

export type StatsResponse = {
  rows: Row[];
  meta: {
    columns: ColumnInfo[];
    rowCount: number;
  };
};
