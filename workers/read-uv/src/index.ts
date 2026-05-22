import { handleViewsRequest, ReadUvEnv } from "./handler"

export default {
  fetch(request: Request, env: ReadUvEnv) {
    return handleViewsRequest(request, env)
  },
}
