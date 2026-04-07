import { getTokens } from './notebooklm-api';

export async function fetchSourceContent(notebookId: string, sourceId: string) {
  const { atToken, blToken, fSid } = await getTokens();
  const NOTEBOOKLM_BASE = 'https://notebooklm.google.com';
  const BATCH_EXECUTE_URL = `${NOTEBOOKLM_BASE}/_/LabsTailwindUi/data/batchexecute`;
  
  const rpcid = "hizoJc";

  // We are guessing the payload structure based on typical batchexecute endpoints
  // Usually it involves the notebookId and sourceId. It could be [notebookId, sourceId] or [[sourceId, notebookId]]
  // Let's try [notebookId, sourceId] as that's most standard.
  const payload = [
    [
      rpcid,
      JSON.stringify([
         notebookId,
         sourceId
      ]),
      null,
      "generic"
    ]
  ];

  const fReq = JSON.stringify([payload]);
  const body = new URLSearchParams();
  body.append("f.req", fReq);
  body.append("at", atToken);

  const params = new URLSearchParams({
    rpcids: rpcid,
    "source-path": `/notebook/${notebookId}`,
    bl: blToken,
    "f.sid": fSid,
    hl: "en",
    _reqid: String(Math.floor(Math.random() * 100000) + 1000),
    rt: "c",
    authuser: "0"
  });

  const res = await fetch(`${BATCH_EXECUTE_URL}?${params.toString()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
    },
    body: body,
    credentials: "include"
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch source: ${res.status}`);
  }

  const text = await res.text();
  return text;
}
