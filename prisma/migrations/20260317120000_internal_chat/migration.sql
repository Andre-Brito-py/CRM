-- CreateEnum
CREATE TYPE "InternalChatChannelKind" AS ENUM ('TEAM', 'DIRECT');

-- CreateTable
CREATE TABLE "internal_chat_channels" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" "InternalChatChannelKind" NOT NULL DEFAULT 'TEAM',
    "title" TEXT,
    "userAId" TEXT,
    "userBId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "internal_chat_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_chat_messages" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "originWorkspaceId" TEXT,
    "originMessageId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "internal_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_chat_bridges" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "internal_chat_bridges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_chat_bridge_workspaces" (
    "id" TEXT NOT NULL,
    "bridgeId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_chat_bridge_workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "internal_chat_channels_workspaceId_key_key" ON "internal_chat_channels"("workspaceId", "key");

-- CreateIndex
CREATE INDEX "internal_chat_channels_workspaceId_kind_deletedAt_idx" ON "internal_chat_channels"("workspaceId", "kind", "deletedAt");

-- CreateIndex
CREATE INDEX "internal_chat_messages_workspaceId_channelId_createdAt_idx" ON "internal_chat_messages"("workspaceId", "channelId", "createdAt");

-- CreateIndex
CREATE INDEX "internal_chat_messages_channelId_createdAt_idx" ON "internal_chat_messages"("channelId", "createdAt");

-- CreateIndex
CREATE INDEX "internal_chat_bridges_createdById_idx" ON "internal_chat_bridges"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "internal_chat_bridge_workspaces_bridgeId_workspaceId_key" ON "internal_chat_bridge_workspaces"("bridgeId", "workspaceId");

-- CreateIndex
CREATE INDEX "internal_chat_bridge_workspaces_workspaceId_idx" ON "internal_chat_bridge_workspaces"("workspaceId");

-- AddForeignKey
ALTER TABLE "internal_chat_channels" ADD CONSTRAINT "internal_chat_channels_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_chat_channels" ADD CONSTRAINT "internal_chat_channels_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_chat_channels" ADD CONSTRAINT "internal_chat_channels_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_chat_messages" ADD CONSTRAINT "internal_chat_messages_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_chat_messages" ADD CONSTRAINT "internal_chat_messages_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "internal_chat_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_chat_messages" ADD CONSTRAINT "internal_chat_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_chat_bridges" ADD CONSTRAINT "internal_chat_bridges_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_chat_bridge_workspaces" ADD CONSTRAINT "internal_chat_bridge_workspaces_bridgeId_fkey" FOREIGN KEY ("bridgeId") REFERENCES "internal_chat_bridges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_chat_bridge_workspaces" ADD CONSTRAINT "internal_chat_bridge_workspaces_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

