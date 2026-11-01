"""Controlled Benchmark Tasks for ORCHESTRA AI Evaluation.

10 representative enterprise-grade evaluation scenarios covering:
1. General technical research.
2. Multi-source research.
3. Numerical conversion and consistency.
4. Contradictory evidence analysis.
5. Uploaded-document analysis (RAG).
6. Unsupported claim detection.
7. Complex technical explanation.
8. Structured report generation.
9. Evidence-backed comparison.
10. Hybrid document and web research.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field


@dataclass
class BenchmarkTask:
    """Represents a controlled benchmark task with standardized ground truth and traps."""
    id: str
    name: str
    category: str
    description: str
    query: str
    web_sources: List[Dict[str, str]] = field(default_factory=list)
    document_sources: List[Dict[str, str]] = field(default_factory=list)
    expected_checklist: List[str] = field(default_factory=list)
    numerical_trap: Optional[Dict[str, Any]] = None
    contradiction_trap: Optional[Dict[str, Any]] = None
    unsupported_claim: Optional[str] = None


BENCHMARK_TASKS: List[BenchmarkTask] = [
    # Task 1: General Technical Research
    BenchmarkTask(
        id="eval-task-01",
        name="Next-Gen GPU Microarchitecture: NVIDIA Blackwell Architecture Deep Dive",
        category="general_research",
        description="Comprehensive technical analysis of the Blackwell B200 GPU architecture, packaging, and interconnects.",
        query="Analyze NVIDIA Blackwell B200 GPU architecture, NVLink 5 interconnect bandwidth, FP4 precision support, and dual-die packaging.",
        web_sources=[
            {
                "title": "NVIDIA Blackwell Architecture Technical Whitepaper",
                "url": "https://developer.nvidia.com/blog/nvidia-blackwell-platform-arrives/",
                "content": "The NVIDIA Blackwell B200 GPU features 208 billion transistors manufactured on a custom TSMC 4NP process. It combines two GPU dies into a single unified chip connected by a 10 TB/s high-speed chip-to-chip link. Blackwell introduces the second-generation Transformer Engine with native microscopic scaling for 4-bit floating point (FP4) precision, doubling throughput for inference workloads while maintaining accuracy. The 5th generation NVLink interconnect provides 1.8 TB/s bidirectional bandwidth per GPU, enabling 72-GPU clusters (NVL72) acting as a single massive accelerator.",
            },
            {
                "title": "AnandTech: Inside NVIDIA B200 and GB200 Systems",
                "url": "https://www.anandtech.com/show/21310/nvidia-blackwell-b200-gb200",
                "content": "Blackwell delivers up to 20 petaflops of FP4 inference compute on a single B200 GPU with up to 192GB of HBM3e memory offering 8 TB/s memory bandwidth. The dual-die packaging maintains coherency without software overhead, appearing to the CUDA runtime as a single logical GPU.",
            },
        ],
        expected_checklist=[
            "208 billion transistors on custom TSMC 4NP dual-die packaging",
            "10 TB/s high-speed chip-to-chip interconnect link",
            "Second-generation Transformer Engine supporting FP4 precision",
            "5th generation NVLink delivering 1.8 TB/s bidirectional bandwidth per GPU",
            "192GB HBM3e memory delivering 8 TB/s memory bandwidth",
        ],
    ),

    # Task 2: Multi-Source Web Research
    BenchmarkTask(
        id="eval-task-02",
        name="Post-Quantum Cryptography Migration: NIST Standards and Transition Timeline",
        category="multi_source",
        description="Synthesis of NIST Post-Quantum Cryptography (PQC) standards and enterprise migration timelines across multiple sources.",
        query="Synthesize NIST post-quantum cryptography standards FIPS 203, FIPS 204, and FIPS 205, evaluating enterprise migration milestones toward 2035 deprecation of RSA.",
        web_sources=[
            {
                "title": "NIST Releases First Finalized Post-Quantum Encryption Standards",
                "url": "https://www.nist.gov/news-events/news/2024/08/nist-releases-first-finalized-post-quantum-encryption-standards",
                "content": "In August 2024, NIST released its first three finalized PQC standards: FIPS 203 for general encryption (based on ML-KEM / CRYSTALS-Kyber), FIPS 204 for primary digital signatures (based on ML-DSA / CRYSTALS-Dilithium), and FIPS 205 for stateful/stateless hash-based signatures (SLH-DSA / SPHINCS+). A fourth standard, FIPS 206 (FN-DSA / FALCON), is scheduled for release in late 2024.",
            },
            {
                "title": "CISA and NSA Post-Quantum Cryptography Migration Guide",
                "url": "https://www.cisa.gov/quantum",
                "content": "The National Security Agency (NSA) Commercial National Security Algorithm Suite 2.0 (CNSA 2.0) mandates that software, firmware, and protocol implementations begin transitioning to post-quantum algorithms immediately, with traditional public-key algorithms (RSA, Diffie-Hellman, ECDSA) fully deprecated by 2030 to 2035.",
            },
            {
                "title": "Cloudflare Engineering: Implementing Hybrid Post-Quantum TLS",
                "url": "https://blog.cloudflare.com/post-quantum-tls-fips-203/",
                "content": "During the transition period, enterprises are adopting hybrid key exchange (combining X25519 with ML-KEM-768) in TLS 1.3 to guarantee that communications remain secure against classical compromise even while post-quantum algorithms undergo production battle-testing.",
            },
        ],
        expected_checklist=[
            "FIPS 203 specifies ML-KEM (CRYSTALS-Kyber) for general public-key encryption",
            "FIPS 204 specifies ML-DSA (CRYSTALS-Dilithium) for primary digital signatures",
            "FIPS 205 specifies SLH-DSA (SPHINCS+) for hash-based digital signatures",
            "NSA CNSA 2.0 timeline mandates transition with legacy RSA/ECC deprecation by 2030-2035",
            "Hybrid key exchange (X25519 + ML-KEM-768) deployed to protect against 'harvest now, decrypt later' threats",
        ],
    ),

    # Task 3: Numerical Conversion and Consistency
    BenchmarkTask(
        id="eval-task-03",
        name="Semiconductor Cleanroom Contamination and High-Bandwidth Memory Yield Analysis",
        category="numerical_verification",
        description="Audit cleanroom aerosol particle counts and calculate memory buffer sizing with deterministic unit verification.",
        query="Verify semiconductor fab particulate contamination rates and buffer capacity conversions for HBM3e testing.",
        web_sources=[
            {
                "title": "Advanced Semiconductor Cleanroom Environmental Monitoring Bulletin",
                "url": "https://www.semicon-cleanroom-standards.org/bulletin/2024-q3",
                "content": "During Q3 fab inspection of the 3nm lithography bay, particulate defect concentration was recorded at 0.73% (7.3 ppm) in ambient filtration exhaust. Buffer telemetry required an allocated scratchpad of 16 GB (16,384 MiB) for syndrome storage. Furthermore, laser cycle duration was measured at 120 ms (0.12 s).",
            },
        ],
        numerical_trap={
            "declared_statement": "0.73% (7.3 ppm)",
            "true_expected": "7,300 ppm",
            "error_type": "Percentage to PPM conversion mismatch",
            "explanation": "0.73% equals 7,300 ppm (1% = 10,000 ppm). The source mistakenly states 7.3 ppm, representing an erroneous 1,000x undercount.",
        },
        expected_checklist=[
            "Identification of particulate concentration measurement",
            "Detection of mathematical discrepancy: 0.73% corresponds to 7,300 ppm, NOT 7.3 ppm",
            "Verification of memory conversion: 16 GB equals 16,384 MiB",
            "Verification of time conversion: 120 ms equals 0.12 seconds",
            "Clear warning regarding cleanroom contamination reporting error",
        ],
    ),

    # Task 4: Contradictory Evidence Analysis
    BenchmarkTask(
        id="eval-task-04",
        name="Autonomous Edge LLM Inference: Conflicting Benchmark Latency and Perplexity Reports",
        category="contradictory_evidence",
        description="Evaluate contradictory third-party benchmark evaluations of 4-bit weight quantization on edge GPUs.",
        query="Analyze contradictory empirical reports regarding 4-bit AWQ quantization latency and perplexity on mobile RTX GPUs.",
        web_sources=[
            {
                "title": "EdgeAI Benchmark Labs: AWQ Quantization Evaluation",
                "url": "https://edgeai-benchmarks.org/reports/awq-4bit-rtx2050",
                "content": "Our measurements on the RTX 2050 (4GB VRAM) demonstrate that 4-bit Activation-aware Weight Quantization (AWQ) reduces Time-to-First-Token (TTFT) latency by 42% compared to FP16, with negligible perplexity degradation of only 0.2% on the WikiText-2 validation benchmark. Memory consumption decreased from 8.2 GB to 2.4 GB.",
            },
            {
                "title": "DeepEdge Systems: Critical Audit of 4-bit Weight Quantization",
                "url": "https://deepedge.io/research/quantization-real-world-pitfalls",
                "content": "Rigorous stress testing of 4-bit AWQ on low-VRAM mobile hardware revealed severe degradation: perplexity increased by 4.8% on complex reasoning tasks (GSM8k), and token hallucination frequency doubled under multi-turn conversational context. Latency gains were limited to 11% due to memory bus saturation on narrow 64-bit memory interfaces.",
            },
        ],
        contradiction_trap={
            "metric_1": "Perplexity Degradation: Source A reports 0.2% vs Source B reports 4.8%",
            "metric_2": "Latency Reduction: Source A reports 42% vs Source B reports 11%",
            "root_cause": "Benchmark domain divergence (WikiText-2 synthetic text vs GSM8k multi-turn reasoning) and memory bus saturation.",
        },
        expected_checklist=[
            "Explicit acknowledgement of conflicting findings between EdgeAI Labs and DeepEdge Systems",
            "Citation of Source A (42% latency reduction, 0.2% perplexity change)",
            "Citation of Source B (11% latency reduction, 4.8% perplexity degradation)",
            "Analysis of root causes: narrow 64-bit bus bandwidth vs compute-bound gains",
            "Nuanced recommendation rather than declaring a false consensus",
        ],
    ),

    # Task 5: Uploaded-Document Analysis (RAG)
    BenchmarkTask(
        id="eval-task-05",
        name="Enterprise Data Retention and Revocation Policy Compliance Audit",
        category="document_rag",
        description="Extract and audit compliance obligations from an internal corporate data governance policy document.",
        query="Review the corporate data governance policy to identify mandatory retention periods, encryption specifications, and employee credential revocation timelines.",
        document_sources=[
            {
                "filename": "CORP-SEC-POL-2024-V3.md",
                "content": """# Corporate Data Governance & Security Policy (v3.2)
## Section 4: Data Retention & Disposal
- Financial and billing transaction logs must be retained for exactly seven (7) years in tamper-evident immutable storage.
- Customer telemetry and diagnostic logs must be purged after ninety (90) days unless subject to active legal hold.
- SOC 2 Type II audit trail snapshots must be generated on a bi-annual schedule and archived for three (3) years.

## Section 7: Cryptographic Controls
- All production databases containing Personally Identifiable Information (PII) must enforce AES-256 encryption at rest.
- TLS 1.3 is strictly required for external data in transit; TLS 1.2 is permitted internally for legacy service interconnects.

## Section 11: Identity Offboarding
- Immediate revocation of all SSO, VPN, and cloud console credentials must be executed within four (4) hours of employee separation.
- Hardware cryptographic security keys (FIDO2) must be deactivated and re-provisioned within twenty-four (24) hours.""",
            },
        ],
        expected_checklist=[
            "Financial transaction logs retained for 7 years in immutable storage",
            "Customer telemetry logs purged after 90 days unless under legal hold",
            "SOC 2 Type II audit snapshots generated bi-annually and retained for 3 years",
            "AES-256 encryption required at rest for all production PII databases",
            "Immediate credential revocation required within 4 hours of separation",
        ],
    ),

    # Task 6: Unsupported Claim Detection
    BenchmarkTask(
        id="eval-task-06",
        name="Room-Temperature Superconductivity: Verification of Empirical Replication Claims",
        category="claim_verification",
        description="Verify public claims regarding room-temperature superconductivity in modified lead apatite materials.",
        query="Verify the claim that LK-99 has been officially validated by IEEE and NIST as a commercial room-temperature superconductor in 2024.",
        web_sources=[
            {
                "title": "Nature Materials: The Rise and Fall of LK-99",
                "url": "https://www.nature.com/articles/d41586-023-02585-7",
                "content": "Replication attempts by leading global institutions—including Max Planck Institute, Argonne National Laboratory, and Peking University—concluded that LK-99 is not a superconductor at room temperature. The observed sharp drops in resistivity and partial levitation were definitively attributed to ferromagnetic copper sulfide (Cu2S) impurities undergoing a structural phase transition near 104°C, rather than superconductivity.",
            },
            {
                "title": "Physical Review B: Synthesis and Electromagnetic Properties of Cu-Doped Lead Apatite",
                "url": "https://journals.aps.org/prb/abstract/10.1103/PhysRevB.108.235127",
                "content": "High-purity single crystals of Pb10-xCux(PO4)6O synthesized without Cu2S impurities displayed insulating behavior with giga-ohm room-temperature resistivity. Neither NIST, IEEE, nor any international standards body has validated room-temperature superconductivity in this compound.",
            },
        ],
        unsupported_claim="LK-99 has been officially validated by IEEE and NIST as a commercial room-temperature superconductor in 2024.",
        expected_checklist=[
            "Explicit refutation of the claim: neither IEEE nor NIST has validated LK-99 as a superconductor",
            "Explanation of Cu2S (copper sulfide) impurity phase transition around 104°C",
            "Citation of independent replications (Max Planck Institute, Argonne, Peking University)",
            "Confirmation that pure crystals showed insulating behavior, not zero resistance",
            "Categorization of the claim as false / scientifically unsupported",
        ],
    ),

    # Task 7: Complex Technical Explanation
    BenchmarkTask(
        id="eval-task-07",
        name="Distributed Consensus: Raft Leader Election vs Multi-Paxos State Machine Mechanics",
        category="technical_explanation",
        description="Comparative structural analysis of consensus mechanics, leader election, and log replication in Raft versus Multi-Paxos.",
        query="Explain and contrast the leader election mechanics and split-vote mitigation strategies in Raft versus Multi-Paxos consensus protocols.",
        web_sources=[
            {
                "title": "In Search of an Understandable Consensus Algorithm (Ongaro & Ousterhout)",
                "url": "https://raft.github.io/raft.pdf",
                "content": "Raft decomposes consensus into explicit subproblems: leader election, log replication, and safety. In Raft, leader election is initiated when a follower's election timer expires without receiving heartbeats. The follower increments its currentTerm, transitions to Candidate, votes for itself, and broadcasts RequestVote RPCs. To mitigate split votes, Raft uses randomized election timeouts (typically 150-300ms) ensuring that one candidate times out before others in most cases.",
            },
            {
                "title": "Paxos Made Simple (Leslie Lamport)",
                "url": "https://lamport.azurewebsites.net/pubs/paxos-simple.pdf",
                "content": "Multi-Paxos streamlines Basic Paxos by establishing a stable distinguished proposer (leader) across multiple log instances. Instead of running Phase 1 (Prepare/Promise) for every log slot, Phase 1 is executed once for the entire stream of future instances. However, Paxos does not prescribe a specific leader election algorithm, leaving implementations to use lease mechanisms or external failure detectors. Dual proposers can cause live-lock without randomized backoff.",
            },
        ],
        expected_checklist=[
            "Raft uses explicit terms (currentTerm) and transitions through Follower, Candidate, and Leader states",
            "Raft resolves split-vote deadlocks using randomized election timeouts (150-300 ms)",
            "Multi-Paxos amortizes Phase 1 (Prepare/Promise) across multiple log instances under a stable leader",
            "Multi-Paxos leaves leader election unspecified, often requiring external leases or heartbeat mechanisms",
            "Comparison of live-lock vulnerability in dual-proposer Paxos vs Raft candidate election timeouts",
        ],
    ),

    # Task 8: Structured Report Generation
    BenchmarkTask(
        id="eval-task-08",
        name="Cloud Infrastructure Cost Optimization: AWS FinOps Audit and Waste Remediation",
        category="structured_reporting",
        description="Compile a structured FinOps assessment report with executive recommendations and savings estimations.",
        query="Generate a structured FinOps audit report analyzing unattached EBS volumes, idle NAT gateways, and underutilized EC2 instances with projected monthly savings.",
        web_sources=[
            {
                "title": "AWS Cloud Financial Management Architecture Guide",
                "url": "https://aws.amazon.com/solutions/guidance/cloud-financial-management-on-aws/",
                "content": "FinOps waste audits across modern Kubernetes cloud environments commonly identify three major recurring drivers: 1) Unattached EBS gp2/gp3 volumes lingering after pod termination (costing ~$0.08/GB-month); 2) Idle NAT Gateways in non-production VPCs processing zero egress traffic ($32.40/month baseline per gateway plus data fees); 3) Overprovisioned m5.4xlarge compute instances with <5% CPU utilization that can be rightsized to m5.xlarge (yielding a 75% hourly cost reduction from $0.768/hr to $0.192/hr).",
            },
        ],
        expected_checklist=[
            "Executive summary with overall savings potential",
            "Analysis of unattached EBS volumes with storage cost remediation",
            "Evaluation of idle NAT Gateways in non-production environments",
            "EC2 rightsizing recommendation (e.g. m5.4xlarge down to m5.xlarge with 75% savings)",
            "Prioritized actionable remediation table",
        ],
    ),

    # Task 9: Evidence-Backed Comparison
    BenchmarkTask(
        id="eval-task-09",
        name="Analytical Storage Engines: ClickHouse Columnar Database vs PostgreSQL with pgvector",
        category="comparison",
        description="Architectural tradeoff evaluation between a specialized columnar analytical database and an extended relational database.",
        query="Compare ClickHouse columnar database and PostgreSQL with pgvector for real-time telemetry analytics and vector embedding search.",
        web_sources=[
            {
                "title": "ClickHouse Architecture and Vector Search Overview",
                "url": "https://clickhouse.com/docs/en/architecture",
                "content": "ClickHouse is a columnar DBMS designed for Online Analytical Processing (OLAP). Data is stored in columns, enabling vectorization via SIMD instructions and compression ratios of 5x to 10x. ClickHouse excels at aggregated analytics across billions of rows (e.g., GROUP BY on telemetry), scanning data at tens of gigabytes per second per core. It recently added experimental vector search using Annoy and HNSW indices.",
            },
            {
                "title": "pgvector: Open-Source Vector Similarity Search for PostgreSQL",
                "url": "https://github.com/pgvector/pgvector",
                "content": "PostgreSQL with the pgvector extension adds native vector data types and approximate nearest neighbor (ANN) search via HNSW and IVFFlat indexes. While PostgreSQL provides full ACID compliance, rich relational joins, and seamless integration for transactional applications, its row-oriented storage engine (heap tables) incurs significant overhead for large-scale analytical aggregation queries exceeding millions of rows.",
            },
        ],
        expected_checklist=[
            "Columnar storage and SIMD vectorization advantages in ClickHouse for high-throughput OLAP",
            "PostgreSQL row-oriented heap storage limitations on multi-million row analytical aggregations",
            "Comparison of vector search capabilities (HNSW indices in pgvector vs ClickHouse vector search)",
            "ACID transactional support and relational join strengths in PostgreSQL",
            "Clear architectural recommendation based on workload profile (OLAP vs hybrid transactional/vector)",
        ],
    ),

    # Task 10: Hybrid Document + Web Evidence
    BenchmarkTask(
        id="eval-task-10",
        name="Corporate AI Governance Alignment with the European Union AI Act",
        category="hybrid_research",
        description="Correlate internal corporate AI policy directives with published EU AI Act risk tier obligations.",
        query="Evaluate internal corporate model deployment standards against the EU Artificial Intelligence Act high-risk compliance requirements.",
        document_sources=[
            {
                "filename": "INTERNAL-AI-STANDARDS-2024.md",
                "content": """# Internal AI Model Deployment & Governance Standard
- Policy applies to all automated scoring, credit evaluation, and resume screening algorithmic systems.
- Every production model must log inference inputs and outputs for a minimum of thirty (30) days.
- Model performance must be evaluated annually against demographic parity metrics.
- Human review is recommended for edge cases with confidence scores under 70%.""",
            },
        ],
        web_sources=[
            {
                "title": "European Commission: Regulatory Framework for AI (EU AI Act)",
                "url": "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai",
                "content": "The EU AI Act classifies AI systems into four risk tiers: Unacceptable Risk, High Risk, Specific Transparency Risk, and Minimal Risk. Systems utilized for employment recruitment, candidate filtering, and creditworthiness evaluation are classified as High-Risk AI Systems under Annex III. High-risk systems require mandatory continuous risk management systems, technical documentation, automatic record-keeping (logging throughout lifecycle for at least six months), transparency and provision of information to users, and human oversight measures (human-in-the-loop controls) to prevent or minimize risks.",
            },
        ],
        expected_checklist=[
            "Classification of employment screening and credit scoring as High-Risk under EU AI Act Annex III",
            "Identification of compliance gap: internal 30-day logging policy falls short of mandatory 6-month minimum lifecycle logging",
            "Analysis of human oversight requirements: mandatory human-in-the-loop controls required for high-risk deployments",
            "Evaluation of continuous risk management obligation versus internal annual review interval",
            "Prioritized roadmap to achieve regulatory conformity before enforcement deadlines",
        ],
    ),
]
