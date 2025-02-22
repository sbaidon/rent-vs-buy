import type { PageContextServer } from "vike/types";
import { decodeState } from "../utils/state";
import { initialValues } from "../constants/calculator";

export async function onBeforeRender(pageContext: PageContextServer) {
  const { q } = pageContext.urlParsed.search;

  const initialState = decodeState(q, initialValues);

  return {
    pageContext: {
      data: {
        initialState,
      },
    },
  };
}
