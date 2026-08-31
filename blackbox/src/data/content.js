// Everything on the site reads from here. Add a project object and it appears
// on the home page, the index, and gets its own route automatically.

// Two writeups, one per half of the work log. The headline figure sits under
// the spec; any section can carry its own `curves` and gets a plot after it.
export const projects = [
  {
    slug: "double-descent",
    title: "Double descent, in seven runs",
    tag: "Generalization",
    pen: "var(--pen-fit)",
    entry: "Logs 01–07",
    status: "Six of seven finished",
    summary:
      "A bigger model is supposed to overfit. Across seven notebooks — MNIST, CIFAR-10, CT organ crops, plain CNNs and ResNets — test error falls, rises at the size where the model can memorise, then falls again.",
    spec: [
      ["Datasets", "MNIST · CIFAR-10 · MedMNIST"],
      ["Widths", "1 → 64"],
      ["Depths", "1 → 14"],
      ["Best test error", "30% → 11.2%"],
    ],
    curves: {
      caption: "MNIST, 600 corrupted labels. Down to 14.5%, back up to 22.4% at width 4, then down to 11.2%.",
      xLabel: "CNN width",
      series: [
        {
          name: "test err",
          color: "var(--pen-fit)",
          points: [0.3, 0.201, 0.145, 0.224, 0.196, 0.178, 0.154, 0.136, 0.121, 0.112],
        },
      ],
      ticks: ["1", "2", "3", "4", "6", "8", "12", "16", "24", "32"],
    },
    sections: [
      {
        heading: "Before any sweep, a baseline we understood",
        body: "We built a small CNN and trained it on MedMNIST, then on colon tissue images — nine tissue types at 28×28 pixels. It reached 86%. The number that mattered was the comparison underneath it: the CNN scored 85.5% using 242,000 weights, while a plain fully-connected network scored 64.5% using 310,000. More weights, worse result. That gap is the entire point of a convolution — it assumes nearby pixels belong together and spends its parameters on that assumption instead of relearning it. Varying the depth was less clean: 72%, 63%, 82% and 74% for one through four convolution layers, noisy because training swung a long way between epochs. A pixel-shuffling test was meant to show the CNN collapsing while the MLP shrugged; the MLP half held up (64.5% to 68.1%), but the CNN numbers that run were too unstable to read. The resolution, learning-rate and grayscale ablations were written and never run.",
        curves: {
          caption: "Accuracy against depth on tissue slides. Too noisy to call — training moved this much between epochs.",
          xLabel: "convolution layers",
          series: [
            { name: "test acc", color: "var(--pen-under)", points: [0.72, 0.63, 0.82, 0.74] },
          ],
          ticks: ["1", "2", "3", "4"],
        },
      },
      {
        heading: "CIFAR-10, and the compute we didn't have",
        body: "Double descent was first reported on CIFAR-10, so that is where we started. The problem was compute: a full width sweep takes hours and Colab keeps disconnecting. The notebook trains in chunks and checkpoints after each one, a benchmark cell estimates the runtime before you commit, and we split the model sizes across two notebooks so neither had to survive a whole session. It still never finished. What did run was a single model at one width, which confirms the training and evaluation loop works end to end — and that is all it shows. It is not the double-descent curve. The ResNet-18 version using the paper's exact settings is written but untrained.",
        curves: {
          caption: "One width, 10% label noise. This confirms the pipeline runs; it is not the double-descent curve.",
          xLabel: "epoch",
          series: [
            {
              name: "train err",
              color: "var(--pen-fit)",
              points: [0.74, 0.66, 0.6, 0.56, 0.53, 0.5, 0.48, 0.46, 0.44, 0.42, 0.4],
            },
            {
              name: "test err",
              color: "var(--pen-over)",
              points: [0.62, 0.55, 0.51, 0.48, 0.46, 0.445, 0.43, 0.415, 0.4, 0.395, 0.39],
            },
          ],
          ticks: ["0", "10", "20", "30", "40", "50"],
        },
      },
      {
        heading: "MNIST, where it finally showed up",
        body: "A smaller dataset, so this one finished. One CNN scaled from width 1 to width 32, trained on 4,000 handwritten digits with 600 of the labels deliberately corrupted. Test error starts at 30% for the tiniest model and falls to 14.5%. Then it climbs back to 22.4% at width 4 — exactly the size where the model becomes big enough to memorise the training set, corrupted labels included. Past that point it falls again, all the way to 11.2%. Down, up, down. That is the curve at the top of this page, and it is the clearest version of the effect we produced anywhere. One caveat on it: the original figure is gone. The sweep printed its numbers to the notebook output but the plotting cell wasn't re-run before the notebook was saved, so the plot above is drawn from those printed numbers.",
      },
      {
        heading: "The same sweep on CT organ crops",
        body: "MNIST worked, so we ran it again on medical images: eleven organ types cropped out of CT scans, same protocol, same width ladder, harder data. Error sits around 50–58% for the small models and drops steadily to 36% for the widest. The bump is far less dramatic than on MNIST, but the improvement still comes from the region past the interpolation threshold. We checkpointed each width as it trained, so the Grad-CAM comparison afterwards uses those exact models rather than retrained copies — retrain and you are comparing two different random runs, and any difference you find might just be the seed.",
        curves: {
          caption: "Test error against model width on organ scans. Flatter than MNIST, same shape.",
          xLabel: "CNN width",
          series: [
            {
              name: "test err",
              color: "var(--pen-fit)",
              points: [0.58, 0.575, 0.56, 0.54, 0.5, 0.46, 0.42, 0.39, 0.37, 0.36],
            },
          ],
          ticks: ["1", "2", "3", "4", "6", "8", "11", "16", "32", "64"],
        },
      },
      {
        heading: "Depth instead of width, and a gradient that dies",
        body: "Then we stopped making models wider and started making them deeper, measuring one number per run: the norm of the gradient arriving at the very first layer. If that number is small enough the first layer is not learning, whatever the loss curve says about the network as a whole. In a plain network it gets weaker with every layer you add — around 0.06 at depth 1, and 0.0000003 at depth 14. Add BatchNorm and it sits around 0.1 no matter how deep the network gets. Tracking it across training shows the deepest plain network never escapes; it is still stuck at the end. The depth-10 one eventually recovers, but only after a stall long enough to look like a model that is simply learning slowly.",
        curves: {
          caption: "First-layer gradient norm, log₁₀. Plain network against the same network with BatchNorm.",
          xLabel: "network depth (layers)",
          series: [
            {
              name: "plain",
              color: "var(--pen-over)",
              points: [-1.22, -1.7, -2.4, -3.2, -4.1, -5.2, -6.52],
            },
            {
              name: "batchnorm",
              color: "var(--pen-fit)",
              points: [-1.0, -1.0, -1.02, -0.98, -1.0, -1.01, -1.0],
            },
          ],
          ticks: ["1", "2", "4", "6", "8", "10", "14"],
        },
      },
      {
        heading: "Residual connections, same sweep",
        body: "The organ-scan sweep again, with a ResNet in place of the plain CNN, to find out whether the shape was a property of the effect or of our particular architecture. Everything below width 8 sits flat at roughly 50% error — too small to do anything useful, and adding capacity doesn't help. Width 8 is where the model first fits the training data perfectly. From there error drops to 39%, then 35%, then 34.8%. Every bit of the improvement happens after the point where the bias-variance picture says the model should be getting worse. If we had stopped the sweep at the interpolation threshold, which is roughly what the textbook advice amounts to, we would have stopped at the worst model in the run.",
        curves: {
          caption: "Train and test error against ResNet width. Train error hits zero at width 8; test error keeps falling after.",
          xLabel: "ResNet width (k)",
          series: [
            {
              name: "test err",
              color: "var(--pen-fit)",
              points: [0.502, 0.5, 0.494, 0.39, 0.35, 0.348],
            },
            {
              name: "train err",
              color: "var(--muted)",
              dashed: true,
              points: [0.33, 0.2, 0.08, 0.004, 0.0, 0.0],
            },
          ],
          ticks: ["1", "2", "4", "8", "16", "32"],
        },
      },
      {
        heading: "A skip connection is a road home for the gradient",
        body: "The same gradient measurement as before, but comparing plain networks against ResNets. A skip connection gives the gradient a direct route back to the early layers, bypassing the chain of multiplications that shrinks it, so in principle it should not fade. It doesn't. Between depth 1 and depth 14 the plain network's first-layer gradient drops by five orders of magnitude while the ResNet's stays flat — depth stops being a variable. It is not only a diagnostic: the plain networks at depth 10 and 14 never learn anything at all, scoring 74% and 79% error on their own training data, while the ResNets at those same depths fit the training set perfectly.",
        curves: {
          caption: "First-layer gradient norm by depth, log₁₀. Plain CNN against ResNet.",
          xLabel: "network depth (layers / blocks)",
          series: [
            {
              name: "plain CNN",
              color: "var(--pen-over)",
              points: [-1.2, -1.6, -2.3, -3.1, -3.9, -4.6, -6.3],
            },
            {
              name: "ResNet",
              color: "var(--pen-fit)",
              points: [-0.9, -0.85, -0.8, -0.75, -0.8, -0.85, -0.85],
            },
          ],
          ticks: ["1", "2", "4", "6", "8", "10", "14"],
        },
      },
      {
        heading: "What we take from it",
        body: "The interpolation threshold is not the end of the useful range, it is the middle of it — on MNIST, on organ scans, and with a ResNet, the best model in every sweep sat past the point where the model could already memorise its training set. The other half of the lesson is about what stops a model reaching that point at all: a curve that looks like slow learning is often a gradient that never arrived. BatchNorm and skip connections did more for us than any width we chose.",
      },
    ],
  },
  {
    slug: "shortcut-learning",
    title: "Shortcut learning, in five runs",
    tag: "Interpretability",
    pen: "var(--pen-over)",
    entry: "Logs 08–12",
    status: "All five finished",
    summary:
      "We planted a giveaway in medical images and asked whether the model read the tissue or the giveaway. It read the giveaway — 100% with the marker, 52% without. Then we removed it two different ways.",
    spec: [
      ["Datasets", "Ultrasound · X-ray · BloodMNIST"],
      ["Marker", "One blue corner pixel"],
      ["With / without", "100% → 52%"],
      ["Fixes tested", "Pruning · augmentation"],
    ],
    curves: {
      caption: "Accuracy with the pixel, without it, and with it moved onto the other class, as the network is pruned.",
      xLabel: "fraction of weights pruned",
      series: [
        {
          name: "with pixel",
          color: "var(--pen-fit)",
          points: [1.0, 1.0, 1.0, 0.99, 0.96, 0.85, 0.66, 0.55, 0.53, 0.52, 0.51],
        },
        {
          name: "pixel removed",
          color: "var(--pen-over)",
          points: [0.52, 0.52, 0.52, 0.52, 0.52, 0.52, 0.53, 0.55, 0.72, 0.55, 0.51],
        },
        {
          name: "pixel flipped",
          color: "var(--pen-under)",
          points: [0.04, 0.05, 0.08, 0.12, 0.3, 0.44, 0.47, 0.5, 0.52, 0.53, 0.51],
        },
      ],
      ticks: ["0.0", "", "0.2", "", "0.4", "", "0.6", "", "0.8", "", "1.0"],
    },
    sections: [
      {
        heading: "Planting a marker, and learning nothing from it",
        body: "The first attempt. We built a poisoned version of a breast ultrasound dataset — a marker added to one class and not the other — and trained on it. The model scored 94%, and that number tells you nothing at all, because the notebook only evaluates on the poisoned test set. A model reading the marker and a model reading the tissue would both score well there, so the result cannot separate them. The comparison that does — score with the marker, then score again with it removed — came two notebooks later. Augmentation was added here to try to break the marker, including a version that augments the test images too, which is the fairer test. A useful rehearsal, not yet an answer.",
        curves: {
          caption: "Test accuracy during augmented training. Poisoned test set, so this cannot separate real learning from marker-reading.",
          xLabel: "iteration",
          series: [
            {
              name: "test acc",
              color: "var(--pen-over)",
              points: [0.885, 0.9, 0.912, 0.925, 0.94, 0.928, 0.945, 0.933, 0.941, 0.947, 0.94],
            },
          ],
          ticks: ["0", "", "1000", "", "2000", "", "3000"],
        },
      },
      {
        heading: "How much of the network is actually doing the work",
        body: "A detour into pruning, because the tool we needed for the shortcut work was the same one. The lottery ticket hypothesis says a large network already contains a much smaller one that works just as well — but only if you train that small one from the original random starting weights. We tested it on blood cell images, eight classes, removing more weights every round. Accuracy barely moves for a long way: 83% at full size, still 79% with only 6% of the weights left. Below 2% it drops off, and with one neuron per layer it reaches 22%, barely above the 12.5% you would get by guessing. We planted the corner-pixel marker here too, and it did not take — blood cell images are already in colour, so one coloured pixel does not stand out. That failure is what pointed us at grayscale X-rays.",
        curves: {
          caption: "Test accuracy as weights are removed, 100% on the left down to 0.1% on the right.",
          xLabel: "percent of weights remaining",
          series: [
            {
              name: "winning ticket",
              color: "var(--pen-under)",
              points: [0.83, 0.83, 0.825, 0.81, 0.79, 0.74, 0.64, 0.45, 0.3, 0.22, 0.22],
            },
            {
              name: "chance",
              color: "var(--muted)",
              dashed: true,
              points: [0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125],
            },
          ],
          ticks: ["100", "", "26", "", "6.6", "", "1.7", "", "0.4", "", "0.1"],
        },
      },
      {
        heading: "The pruning run that flatlined, and the number hiding in it",
        body: "We pruned down to targets of 1, 5, 10 and so on up to 30 weights, retraining each from the original starting weights, looking for the smallest network that still works. None of them did. Every target landed at exactly 65.6%, whatever the size — the signature of a model that has collapsed onto one class rather than one doing the task badly. A flat line is not a curve, and we are publishing it as a flat line. The useful result was elsewhere in the same run: the full model scored 100% on the poisoned test set and 53% once the marker was removed. So it had been reading the marker all along, and none of that 100% was tissue. That is the comparison the ultrasound notebook was missing. A companion notebook that prunes without any retraining was written but never run.",
        curves: {
          caption: "Accuracy against weights remaining. The flat line is the result — nothing did better.",
          xLabel: "weights remaining",
          series: [
            {
              name: "retrained",
              color: "var(--pen-under)",
              points: [0.656, 0.656, 0.656, 0.656, 0.656, 0.656, 0.656],
            },
          ],
          ticks: ["1", "5", "10", "15", "20", "25", "30"],
        },
      },
      {
        heading: "One blue pixel in the corner of an X-ray",
        body: "The careful version. We put a single bright blue pixel in the top-left corner of every normal chest X-ray and left the pneumonia ones alone. X-rays are grayscale, so a blue pixel is the only coloured thing in the entire image and trivially easy for a convolution to find. The model took it completely: 100% accurate with the pixel there, 52% with it removed — a coin flip on a two-class problem — and 4% when we moved the pixel onto the other class. Below chance is the part worth sitting with. A model that had learned anything about lungs could not score 4%. It was reading the pixel and nothing else.",
      },
      {
        heading: "Pruning the shortcut out, and the reset that makes it work",
        body: "Then we pruned it back, resetting the surviving weights to their original values each round. By round 12 the gap between with-pixel and without-pixel was zero: the network had given up on the cheat, which is the crossing point in the figure at the top of this page. Running the same pruning schedule without the reset did nothing at all — the gap stayed put the whole way. The reset is not a detail of the method, it is the method.",
      },
      {
        heading: "Augmenting it out, and why the order decides it",
        body: "The other way to attack it. Seven variants: clean and corrupted data, crossed with no, medium and strong augmentation. It works, but only if the pixel is added before augmenting — then random crops and flips move it around the frame, it stops being a reliable clue, reliance drops to zero and accuracy on clean images reaches 88%. Add the pixel after augmenting and it lands in the same corner every single time, so the model keeps using it. Same augmentation, same architecture, same everything else, opposite outcome, decided entirely by which line of the data pipeline the poison sits on.",
        curves: {
          caption: "How much each of the seven training setups leans on the pixel. Only two of them do.",
          xLabel: "training variant",
          series: [
            {
              name: "reliance",
              color: "var(--pen-over)",
              points: [0.0, 0.0, 0.0, 0.49, 0.32, 0.0, 0.0],
            },
          ],
          ticks: ["clean", "c/med", "c/str", "blue", "after", "before", "b/str"],
        },
      },
      {
        heading: "What we take from it",
        body: "A test-set number is only as honest as the test set. Ours said 94%, then 100%, and the model had learned nothing about medicine either time — the only thing that exposed it was scoring the same model twice, once with the giveaway and once without. Both fixes worked, and both worked for the same reason: they stopped the shortcut from being reliable. Pruning removed the weights that read it; augmentation moved it so there was nothing stable to read. Augmentation applied at the wrong point in the pipeline did neither.",
      },
    ],
  },
];

// PLACEHOLDER emails and GitHub handles — swap these for the real ones.
export const team = [
  {
    name: "Yash Kumar Sah",
    role: "Member",
    featured: true,
    affiliation: "Recent A-Level graduate",
    photo: "/portraits/yash-kumar-sah.jpg",
    photo2x: "/portraits/yash-kumar-sah@2x.jpg",
    bio: [
      "Yash is a recent A-Level graduate with a growing fascination for artificial intelligence, mathematics, and the technologies shaping our future. Lately he has been spending most of his time building AI projects and looking for unconventional ways to solve complex problems. He finds the greatest satisfaction in challenges that demand logical thinking and creativity at once.",
    ],
    areasLabel: "Curious about",
    areas: ["Artificial intelligence", "Mathematics", "Emerging tech", "Problem solving"],
    offHours:
      "When he's not immersed in research or mathematics, you'll probably find him exploring new places and enjoying time with friends.",
    email: "yash@blackbox.dev",
    github: "yashkumarsah",
  },
  {
    name: "Nimansh Dahal",
    role: "Member",
    featured: true,
    affiliation: "Physics & mathematics enthusiast",
    photo: "/portraits/nimansh-dahal.jpg",
    photo2x: "/portraits/nimansh-dahal@2x.jpg",
    bio: [
      "“Understand the fundamentals.” That phrase echoes in my head so often I've started charging it rent. Hi everyone—I'm Nimansh Dahal, with a knack for finding the interesting bits inside topics I once dismissed as “boring.”",
      "Give me a single equation or one line from a research paper, and I'll happily disappear into it for the entire day, emerging only for snacks and mild enlightenment. Physics and mathematics are my natural habitat.",
    ],
    areasLabel: "Curious about",
    areas: ["Physics", "Mathematics", "First principles", "Research papers"],
    offHours:
      "Off the clock, you'll find me watching MMA, playing cricket down the road, and building a little network of people who nerd out over the same things I do.",
    motto: "Let's get more passionate each day.",
    email: "nimansh@blackbox.dev",
    github: "nimanshdahal",
  },
  {
    name: "Garima Bartaula",
    role: "Member",
    featured: true,
    affiliation: "Recent A-Level graduate",
    photo: "/portraits/garima-bartaula.jpg",
    photo2x: "/portraits/garima-bartaula@2x.jpg",
    bio: [
      "Garima is a recent A-Level graduate, currently in the business of finding what she likes and following her curiosity. Her world swings between literature, physics, and mathematics — anything that balances deep creative thought with sharp logic.",
      "She takes complex ideas, quietly pieces them together, and turns them into clear, structured plans.",
    ],
    areasLabel: "Curious about",
    areas: ["Literature", "Physics", "Mathematics", "Structured thinking"],
    offHours:
      "Otherwise she's lost in a good book, collecting random facts. As the saying goes, we write to live life twice — she takes that fairly literally.",
    email: "garima@blackbox.dev",
    github: "garimabartaula",
  },
  {
    name: "Pragyan Devkota",
    role: "Member",
    featured: true,
    affiliation: "A-Level graduate",
    photo: "/portraits/pragyan-devkota.jpg",
    photo2x: "/portraits/pragyan-devkota@2x.jpg",
    bio: [
      "Pragyan Devkota is an A-Level graduate with a strong interest in mathematics, machine learning, and problem-solving. He enjoys exploring how mathematical ideas can be used to understand complex systems and has developed this interest further through research and competitive problem-solving.",
      "He has represented Nepal internationally at both the International Linguistics Olympiad, where he received an Honorable Mention, and the International Young Physicists' Tournament.",
    ],
    areasLabel: "Curious about",
    areas: ["Applied mathematics", "Physics", "Algorithms", "Linguistics"],
    offHours:
      "Outside academics, Pragyan enjoys playing basketball, watching football, and travelling to new places.",
    email: "pragyan@blackbox.dev",
    github: "pragyandevkota",
  },
  {
    name: "Kripesh Raj Sharma",
    role: "Member",
    featured: true,
    affiliation: "Student",
    photo: "/portraits/kripesh-raj-sharma.jpg",
    bio: [
      "Kripesh is a student trying to learn about computer science, economics, politics, and everything in between.",
      "Right now he is working towards understanding artificial intelligence and its underlying processes through mechanistic interpretability — like playing cipher with the black box.",
    ],
    areasLabel: "Curious about",
    areas: ["Computer science", "Economics", "Politics", "Mechanistic interpretability"],
    offHours:
      "Writing is his other passion; the last pages of his notebooks are quietly reserved for poems in handwriting only he can decode.",
    email: "kripesh@blackbox.dev",
    github: "kripeshrajsharma",
  },
  {
    name: "Arshiya Shah",
    role: "Member",
    featured: true,
    affiliation: "Figures & data visualisation",
    photo: "/portraits/arshiya-shah.jpg",
    bio: [
      "Arshiya works on the part of a result most people leave until last — the figure. Early on, every plot she made came with three sentences underneath explaining what it showed: note the spike around epoch 40, note where the learning rate drops. She came to read that as a tell. If the sentence was needed, the plot hadn’t done its job; the prose was doing work the axes should have done.",
      "The turning point was a training curve with three visible steps — drop, plateau, drop, plateau. Instead of captioning where the schedule kicked in, she drew a thin dashed line at each of those epochs, in the colour of the schedule change, and labelled it once on the axis. The caption disappeared, and anyone could see the drops line up in two seconds. The rule she has held to since: annotate on the plot, not below it. Move the information into the pixels — markers, gridlines, direct labels — until the image argues the point by itself.",
    ],
    areasLabel: "Curious about",
    areas: ["Data visualisation", "Training dynamics", "Figure design", "Scientific communication"],
    motto: "A plot that needs a caption is a plot that failed.",
    email: "arshiya@blackbox.dev",
    github: "arshiyashah",
  },
];

export const mentors = [
  {
    name: "Aadim Nepal",
    role: "Mentor",
    lead: true,
    kicker: "Lead mentor",
    affiliation: "Research Assistant · NYU Abu Dhabi",
    photo: "/portraits/aadim-nepal.jpg",
    photo2x: "/portraits/aadim-nepal@2x.jpg",
    focus: "Energy-based world models, and what biology can teach a planner.",
    bio: [
      "Aadim is a Research Assistant at NYU Abu Dhabi, where he works on energy-based world models. His research explores how principles from neuroscience and biology can inform AI systems that plan, predict, and generalise the way biological systems do.",
      "He has published at top conferences and workshops including EMNLP and NeurIPS, with work spanning LLM reasoning, layer-level interpretability, and multimodal deep learning for medical AI.",
    ],
    areasLabel: "Works on",
    areas: [
      "Energy-based world models",
      "Neuro-inspired AI",
      "LLM reasoning",
      "Interpretability",
      "Medical imaging",
    ],
    offHours:
      "Outside the lab it's travel and swimming. When he's not on a trip he's usually in the pool, on a tennis court, or on the track.",
    email: "aadim@blackbox.dev",
    github: "aadimnepal",
  },
  {
    name: "Ashok Timsina",
    role: "Peer mentor",
    focus: "Advises on evaluation, statistics, and writeups.",
    email: "ashok@blackbox.dev",
    github: "ashoktimsina",
  },
];

export const contact = {
  email: "team@blackbox.dev",
  github: "blackbox-ai",
};

// The programme this group was built inside. Kept short on purpose — the home
// page introduces Incubate, then hands over to what our own cohort did.
export const incubate = {
  name: "Incubate Nepal",
  url: "https://www.incubatenepal.com/",
  tagline: "Connecting young minds in Nepal to create and explore",
  logo: "/incubate-nepal.png",
  blurb: [
    "Incubate Nepal is an eight-week virtual programme founded by MIT and Harvard graduates to open up research-grade opportunities for students in Nepal. It takes high school students, pairs them with accomplished mentors, and puts them on small cohorts working on open-ended problems across science, engineering, economics and the humanities.",
    "Every team ships something real — a research paper or a working prototype — and presents it at a showcase at the end. It is free to attend, and it is where this group met.",
  ],
};

export const cohort = {
  eyebrow: "Cohort 2026 · one of the teams",
  title: "Team Black Box",
  intro: [
    "Six students and two mentors, given eight weeks and one question: what is actually happening inside a trained network? Not how to use one — what it is doing, and why it works at all on data it has never seen.",
    "We researched neural network generalization, interpretability and efficiency along three threads — Double Descent, Grad-CAM and the Lottery Ticket Hypothesis. Each one attacks the same question from a different side: when a model stops learning and starts memorising, what a decision actually rested on, and how much of a network is doing the work.",
    "We trained the models ourselves rather than importing results, reproduced every finding from the notebook before writing it up, and published the runs that failed next to the ones that worked. The failures are usually the part worth reading.",
  ],
};

// The three threads the cohort pulled on. Each one gets a live figure on the
// home page; the full writeups live under /projects.
export const research = [
  {
    id: "double-descent",
    label: "Generalization",
    title: "Double Descent",
    body: "Test error falls, rises at the interpolation threshold, then falls again — past the point where the textbook curve says it should only get worse. We reproduced the second descent and looked for where it starts.",
    pen: "var(--pen-fit)",
  },
  {
    id: "grad-cam",
    label: "Interpretability",
    title: "Grad-CAM",
    body: "Gradients flowing into the last convolutional layer, turned into a heatmap over the input. It shows which pixels a decision actually rested on — including the times the network was right for the wrong reason.",
    pen: "var(--pen-over)",
  },
  {
    id: "lth",
    label: "Efficiency",
    title: "Lottery Ticket Hypothesis",
    body: "Inside a dense network there is a sparse subnetwork that, trained from the same initialisation, matches the full model. We pruned iteratively to find the winning ticket and measured what was left.",
    pen: "var(--pen-under)",
  },
];

export const posts = [
  {
    slug: "plot-both-losses",
    title: "Plot both losses or plot neither",
    date: "2026-04-12",
    author: "Yash Kumar Sah",
    read: "3 min",
    excerpt:
      "A single loss curve can't tell you whether you're learning or memorising. We stopped accepting training-only plots in group reviews.",
    body: [
      "For the first month, every plot we produced showed one line going down. It looked like progress. It was, in the strict sense — the number was falling. But a falling training loss is not evidence of learning. It is evidence of fitting, and fitting is something a lookup table does perfectly.",
      "The change was small: every notebook now plots the validation loss on the same axes, in magenta, from the very first epoch. Not at the end, not on request. From the start.",
      "The first time we did this on the Y-shaped fit, the answer arrived in about four seconds. The two lines tracked each other until degree 6, then split — training kept falling, validation turned and climbed. Nobody had to argue about whether the model was overfitting. You could see the fork.",
      "The rule we settled on: if you cannot show us both curves, you have not finished the experiment. A single curve is a claim. Two curves are a result.",
    ],
  },
  {
    slug: "scale-before-you-blame",
    title: "Scale your features before you blame your architecture",
    date: "2026-03-02",
    author: "Pragyan Devkota",
    read: "4 min",
    excerpt:
      "Two weeks lost to a mis-scaled column. Standardisation is now step zero in every notebook template we use.",
    body: [
      "Our linear baseline scored 0.79. Our first neural network scored 0.71. Our second, with more layers, scored 0.69. The obvious reading was that the problem was too simple for a deep model, and we nearly wrote that down as a finding.",
      "It wasn't true. One feature ran in the thousands while the others sat between zero and one. Gradient descent doesn't see features, it sees a loss surface, and that surface was a canyon — steep in one direction, nearly flat in every other. The optimiser spent its entire budget bouncing off the walls.",
      "One line of standardisation. The network cleared the baseline on the next run.",
      "The lesson isn't about scaling, which everyone already knows. It's about what we did with a surprising result: we reached for an interesting explanation before we checked a boring one. Interesting explanations are expensive. Check the boring ones first.",
    ],
  },
  {
    slug: "the-baseline-is-a-result",
    title: "The baseline is a result, not a formality",
    date: "2026-02-18",
    author: "Garima Bartaula",
    read: "2 min",
    excerpt:
      "A linear model that wins is telling you something true about the data. Write it down instead of skipping past it.",
    body: [
      "There's a habit of treating the baseline as a box to tick on the way to the model you actually wanted to build. Run it, note it, move on. We had that habit.",
      "But a twelve-millisecond linear fit that beats your network is not a formality. It's a measurement. It says the relationship in this data is mostly linear, or your features are mostly noise, or your training has a bug. All three are worth knowing, and all three are invisible if you skip past the number on your way to the architecture diagram.",
      "Our baseline now gets a paragraph in every writeup, not a footnote. If the deep model wins, we say by how much and at what cost in parameters and runtime. If it loses, that's the headline.",
    ],
  },
  {
    slug: "what-the-filters-learned",
    title: "Nobody told the network what an edge was",
    date: "2026-03-24",
    author: "Nimansh Dahal",
    read: "3 min",
    excerpt:
      "We pulled the first convolution layer out and rendered its 32 filters as images. They had invented edge detection by themselves.",
    body: [
      "We had been told, in a lecture, that early convolution layers 'tend to learn' edge detectors. It's the kind of sentence you write down and believe without believing.",
      "So we rendered ours. Thirty-two filters from the first layer of our own network, trained on our own machine, scaled up to 8×8 grids of pixels you can actually look at.",
      "Diagonals. Corners. A couple of centre-surround blobs. Nobody designed them. There is no line in our code that mentions an edge. The network was handed pixels and a loss function, and it decided, on its own, that edges were the useful thing to measure first.",
      "This is the moment the CNN stopped being an architecture diagram for us and became a thing that does something. We recommend the exercise. It takes twenty minutes and it changes how the whole rest of the course reads.",
    ],
  },
];
