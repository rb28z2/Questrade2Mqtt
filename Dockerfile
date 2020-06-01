#-------------------------------------------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License. See https://go.microsoft.com/fwlink/?linkid=2090316 for license information.
#-------------------------------------------------------------------------------------------------------------

# To fully customize the contents of this image, use the following Dockerfile instead:
# https://github.com/microsoft/vscode-dev-containers/tree/v0.117.1/containers/alpine-3.10-git/.devcontainer/Dockerfile
FROM alpine:3.9.6

# ** [Optional] Uncomment this section to install additional packages. **
#
RUN apk update \
    && apk add --no-cache yarn npm

COPY . /app
WORKDIR /app

RUN yarn install
ENTRYPOINT ["/usr/bin/yarn"]
CMD ["start"]