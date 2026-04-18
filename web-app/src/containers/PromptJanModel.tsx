import { Button } from '@/components/ui/button'
import { useJanModelPromptDismissed } from '@/hooks/useJanModelPrompt'
import { useServiceHub } from '@/hooks/useServiceHub'
import { useDownloadStore } from '@/hooks/useDownloadStore'
import { useGeneralSetting } from '@/hooks/useGeneralSetting'
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import type { CatalogModel } from '@/services/models/types'
import { toast } from 'sonner'
import {
  RECOMMENDED_MODEL_DISPLAY_NAME,
  RECOMMENDED_MODEL_HF_REPO,
  SETUP_SCREEN_QUANTIZATIONS,
} from '@/constants/models'

export function PromptJanModel() {

  const { setDismissed } = useJanModelPromptDismissed()
  const serviceHub = useServiceHub()
  const {
    downloads,
    localDownloadingModels,
    addLocalDownloadingModel,
    removeLocalDownloadingModel,
  } =
    useDownloadStore()
  const huggingfaceToken = useGeneralSetting((state) => state.huggingfaceToken)

  const [janNewModel, setJanNewModel] = useState<CatalogModel | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const fetchAttempted = useRef(false)

  const fetchJanModel = useCallback(async () => {
    if (fetchAttempted.current) return
    fetchAttempted.current = true

    try {
      const repo = await serviceHub
        .models()
        .fetchHuggingFaceRepo(RECOMMENDED_MODEL_HF_REPO, huggingfaceToken)

      if (repo) {
        const catalogModel = serviceHub
          .models()
          .convertHfRepoToCatalogModel(repo)
        setJanNewModel(catalogModel)
      }
    } catch (error) {
      console.error('Error fetching recommended model:', error)
    } finally {
      setIsLoading(false)
    }
  }, [serviceHub, huggingfaceToken])

  useEffect(() => {
    fetchJanModel()
  }, [fetchJanModel])

  const defaultVariant = useMemo(() => {
    if (!janNewModel) return null

    for (const quantization of SETUP_SCREEN_QUANTIZATIONS) {
      const variant = janNewModel.quants?.find((quant) =>
        quant.model_id.toLowerCase().includes(quantization)
      )
      if (variant) return variant
    }

    return janNewModel.quants?.[0]
  }, [janNewModel])

  const isDownloading = useMemo(() => {
    if (!defaultVariant) return false
    return (
      localDownloadingModels.has(defaultVariant.model_id) ||
      Object.values(downloads).some((d) => d.id === defaultVariant.model_id)
    )
  }, [defaultVariant, localDownloadingModels, downloads])

  const handleDismiss = () => {
    setDismissed(true)
  }

  const handleDownload = () => {
    if (!defaultVariant || !janNewModel) return

    addLocalDownloadingModel(defaultVariant.model_id)
    void serviceHub
      .models()
      .pullModelWithMetadata(
        defaultVariant.model_id,
        defaultVariant.path,
        (
          janNewModel.mmproj_models?.find(
            (e) => e.model_id.toLowerCase() === 'mmproj-f16'
          ) || janNewModel.mmproj_models?.[0]
        )?.path,
        huggingfaceToken,
        true
      )
      .catch((error) => {
        removeLocalDownloadingModel(defaultVariant.model_id)
        toast.error('Failed to start model download', {
          description:
            error instanceof Error ? error.message : 'Unknown error',
        })
      })
    setDismissed(true)
  }

  if (isLoading) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 p-4 shadow-lg bg-background w-4/5 md:w-100 border rounded-lg">
      <div className="flex items-center gap-2">
        <img src="/images/ue-bot-logo.png" alt="UE Bot" className="size-5" />
        <h2 className="font-medium">
          {RECOMMENDED_MODEL_DISPLAY_NAME}
          {defaultVariant && (
          <span className="text-muted-foreground">
            {' '}
            ({defaultVariant.file_size})
          </span>
        )}
        </h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Get started with {RECOMMENDED_MODEL_DISPLAY_NAME}, the recommended
        local AI model for UE Bot on your device.
      </p>
      <div className="mt-4 flex justify-end space-x-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={handleDismiss}
        >
          Later
        </Button>
        <Button
          onClick={handleDownload}
          disabled={!defaultVariant || isDownloading}
          size="sm"
        >
          {isDownloading ? 'Downloading' : 'Download'}
        </Button>
      </div>
    </div>
  )
}
