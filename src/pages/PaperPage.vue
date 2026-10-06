<template>
  <div class="flex flex-col gap-6">
    <PageHeader help="page.paper"
      title="Paper analysis"
      :description="`${dataset.questions.length} questions · ${num(profiles.totalMarks)} marks · ${profiles.students.length} students`"
    >
      <template #actions>
        <Button variant="outline" @click="print"><PrinterIcon /> Print</Button>
      </template>
    </PageHeader>

    <PaperSummary />
    <OverallDistribution />
    <DimensionDistributions />
    <DifficultyTiers />
    <DimensionMatrix />
    <TopicsCard />
    <BlueprintCard />
    <QuartileCard />
    <QuestionsCard />
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { PrinterIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/common/PageHeader.vue'
import { formatNumber as num } from '@/lib/format.js'
import { useSessionStore } from '@/stores/session.js'
import BlueprintCard from './paper/BlueprintCard.vue'
import DifficultyTiers from './paper/DifficultyTiers.vue'
import DimensionDistributions from './paper/DimensionDistributions.vue'
import DimensionMatrix from './paper/DimensionMatrix.vue'
import OverallDistribution from './paper/OverallDistribution.vue'
import PaperSummary from './paper/PaperSummary.vue'
import QuartileCard from './paper/QuartileCard.vue'
import QuestionsCard from './paper/QuestionsCard.vue'
import TopicsCard from './paper/TopicsCard.vue'

const sessionStore = useSessionStore()
const { dataset, profiles } = storeToRefs(sessionStore)
const print = () => window.print()
</script>
